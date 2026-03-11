import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeSummary } from "@/lib/utils/serializers";
import { ApiError, badRequest, notFound } from "@/lib/server/errors";
import { toObjectId } from "@/lib/utils/object-id";
import type { SummaryResponse, SummaryRequest } from "@/lib/ai/types";
import { CanvasModel, NodeModel, SummaryModel } from "@/models";

const MIN_CONTEXT_NODES = 3;
const MIN_CONTEXT_CHARACTERS = 1200;
const SUMMARY_QUERY_TIMEOUT_MS = 5000;
const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_SUMMARY_MODEL = "gpt-5-mini";
const DEFAULT_OPENAI_SUMMARY_MAX_OUTPUT_TOKENS = 220;
const OPENAI_SUMMARY_TIMEOUT_MS = 45000;

type OpenAiResponsesPayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<
      | {
          type?: string;
          text?: string;
        }
      | {
          type?: string;
          refusal?: string;
        }
    >;
  }>;
  status?: string;
  incomplete_details?: {
    reason?: string;
  };
  error?: {
    message?: string;
  };
};

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function sameIdOrder(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function buildInlineSummarySnapshot(input: {
  canvasId: string;
  baseNodeId: string;
  summaryText: string;
  sourceNodeIds: string[];
}) {
  return {
    id: `inline-${input.baseNodeId}`,
    canvasId: input.canvasId,
    baseNodeId: input.baseNodeId,
    summaryText: input.summaryText,
    sourceNodeIds: input.sourceNodeIds,
    estimatedTokenCount: estimateTokenCount(input.summaryText),
    createdAt: new Date().toISOString()
  };
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

function getOpenAiSummaryConfig() {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new ApiError(500, "OPENAI_API_KEY is not configured.");
  }

  const rawMaxOutputTokens =
    process.env.OPENAI_SUMMARY_MAX_OUTPUT_TOKENS?.trim() ?? `${DEFAULT_OPENAI_SUMMARY_MAX_OUTPUT_TOKENS}`;
  const maxOutputTokens = Number.parseInt(rawMaxOutputTokens, 10);

  if (!Number.isFinite(maxOutputTokens) || maxOutputTokens <= 0) {
    throw new ApiError(500, "OPENAI_SUMMARY_MAX_OUTPUT_TOKENS must be a positive integer.");
  }

  return {
    apiKey,
    model: process.env.OPENAI_SUMMARY_MODEL?.trim() || DEFAULT_OPENAI_SUMMARY_MODEL,
    maxOutputTokens
  };
}

function buildSummaryContext(nodes: Array<{ title?: string | null; content: string }>) {
  return nodes
    .map((node, index) => {
      const cleanedContent = node.content.replace(/\s+/g, " ").trim();
      const title = node.title?.trim();
      const header = title ? `Story node ${index + 1}: ${title}` : `Story node ${index + 1}`;

      return `${header}\n${cleanedContent}`;
    })
    .join("\n\n");
}

function extractOutputText(payload: OpenAiResponsesPayload) {
  const direct = payload.output_text?.trim();

  if (direct) {
    return direct;
  }

  const fragments =
    payload.output?.flatMap((item) =>
      item.type === "message"
        ? (item.content ?? []).flatMap((contentItem) => {
            if ("text" in contentItem && contentItem.type === "output_text" && contentItem.text?.trim()) {
              return [contentItem.text.trim()];
            }

            return [];
          })
        : []
    ) ?? [];

  return fragments.join("\n").trim();
}

async function readOpenAiError(response: Response) {
  try {
    const payload = (await response.json()) as OpenAiResponsesPayload;
    return payload.error?.message ?? "OpenAI summary generation failed.";
  } catch {
    return "OpenAI summary generation failed.";
  }
}

async function generateOpenAiSummary(nodes: Array<{ title?: string | null; content: string }>) {
  const config = getOpenAiSummaryConfig();
  const branchContext = buildSummaryContext(nodes);

  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      instructions:
        "You summarize earlier branch context for a relay novel writer. Write a concise summary in plain prose, keep spoilers only to what is already in the provided text, preserve major character actions, tone shifts, and unresolved threads, and stay within 2 to 4 sentences.",
      input: branchContext,
      max_output_tokens: config.maxOutputTokens
    }),
    signal: AbortSignal.timeout(OPENAI_SUMMARY_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new ApiError(502, await readOpenAiError(response));
  }

  const payload = (await response.json()) as OpenAiResponsesPayload;
  const summaryText = extractOutputText(payload);

  if (summaryText) {
    return summaryText;
  }

  const incompleteReason = payload.incomplete_details?.reason;

  if (payload.status === "incomplete" && incompleteReason) {
    throw new ApiError(502, `OpenAI summary generation was incomplete: ${incompleteReason}.`);
  }

  throw new ApiError(502, "OpenAI summary response did not include text.");
}

export async function getSummaryForBranch(input: SummaryRequest): Promise<SummaryResponse> {
  await connectToDatabase();

  const canvasId = toObjectId(input.canvasId, "canvasId");
  const baseNodeId = toObjectId(input.baseNodeId, "baseNodeId");

  const [canvas, baseNode] = await Promise.all([
    CanvasModel.findById(canvasId).maxTimeMS(SUMMARY_QUERY_TIMEOUT_MS),
    NodeModel.findById(baseNodeId).maxTimeMS(SUMMARY_QUERY_TIMEOUT_MS)
  ]);

  if (!canvas) {
    throw notFound("Canvas not found.");
  }

  if (!baseNode || baseNode.canvasId.toString() !== canvasId.toString()) {
    throw notFound("Base node not found inside this canvas.");
  }

  const orderedSourceNodeIds = baseNode.ancestorIds.map((ancestorId) => ancestorId.toString());
  const sourceNodes = orderedSourceNodeIds.length
    ? await NodeModel.find({
        _id: { $in: baseNode.ancestorIds },
        canvasId
      }).maxTimeMS(SUMMARY_QUERY_TIMEOUT_MS)
    : [];

  const sourceNodeMap = new Map(sourceNodes.map((node) => [node._id.toString(), node]));
  const orderedSourceNodes = orderedSourceNodeIds.flatMap((nodeId) => {
    const node = sourceNodeMap.get(nodeId);
    return node ? [node] : [];
  });

  if (orderedSourceNodes.length !== orderedSourceNodeIds.length) {
    throw badRequest("Branch context is incomplete for this node.");
  }

  const sourceContents = orderedSourceNodes.map((node) => node.content.trim()).filter(Boolean);
  const sourceNodeCount = sourceContents.length;
  const sourceCharCount = sourceContents.reduce((total, content) => total + content.length, 0);
  const meta = {
    sourceNodeCount,
    sourceCharCount,
    hiddenByDefault: true as const
  };

  if (sourceNodeCount < MIN_CONTEXT_NODES && sourceCharCount < MIN_CONTEXT_CHARACTERS) {
    return {
      status: "not_needed",
      source: null,
      summary: null,
      meta
    };
  }

  try {
    const existingSummary = await SummaryModel.findOne({ canvasId, baseNodeId })
      .sort({ updatedAt: -1 })
      .maxTimeMS(SUMMARY_QUERY_TIMEOUT_MS);

    if (existingSummary) {
      const existingSourceNodeIds = existingSummary.sourceNodeIds.map((nodeId) => nodeId.toString());

      if (sameIdOrder(existingSourceNodeIds, orderedSourceNodeIds)) {
        return {
          status: "ready",
          source: "cache",
          summary: serializeSummary(existingSummary),
          meta
        };
      }
    }
  } catch (error) {
    console.warn("Summary cache lookup failed, continuing with live generation.", error);
  }

  const summaryText = await generateOpenAiSummary(orderedSourceNodes);
  try {
    const savedSummary = await SummaryModel.findOneAndUpdate(
      { canvasId, baseNodeId },
      {
        $set: {
          summaryText,
          sourceNodeIds: orderedSourceNodes.map((node) => node._id),
          estimatedTokenCount: estimateTokenCount(summaryText)
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).maxTimeMS(SUMMARY_QUERY_TIMEOUT_MS);

    if (savedSummary) {
      return {
        status: "ready",
        source: "openai",
        summary: serializeSummary(savedSummary),
        meta
      };
    }
  } catch (error) {
    console.warn("Summary persistence failed, returning uncached live summary.", error);
  }

  return {
    status: "ready",
    source: "openai",
    summary: buildInlineSummarySnapshot({
      canvasId: canvasId.toString(),
      baseNodeId: baseNodeId.toString(),
      summaryText,
      sourceNodeIds: orderedSourceNodeIds
    }),
    meta
  };
}
