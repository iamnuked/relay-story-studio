import { connectToDatabase } from "@/lib/db/mongoose";
import { serializeSummary } from "@/lib/utils/serializers";
import { badRequest, notFound } from "@/lib/server/errors";
import { toObjectId } from "@/lib/utils/object-id";
import type { SummaryResponse, SummaryRequest } from "@/lib/ai/types";
import { CanvasModel, NodeModel, SummaryModel } from "@/models";

const MIN_CONTEXT_NODES = 3;
const MIN_CONTEXT_CHARACTERS = 1200;

function splitSentences(content: string) {
  const cleaned = content.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizeSentence(sentence: string) {
  return sentence.replace(/[\s.?!]+/g, " ").trim().toLowerCase();
}

function ensureSentenceEnding(sentence: string) {
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function buildMockSummary(sourceContents: string[]) {
  const sourceSentences = sourceContents.flatMap(splitSentences);
  const picked: string[] = [];
  const seen = new Set<string>();

  const candidateIndexes = [0, Math.floor(sourceSentences.length / 2), sourceSentences.length - 1];

  for (const index of candidateIndexes) {
    const sentence = sourceSentences[index];

    if (!sentence) {
      continue;
    }

    const normalized = normalizeSentence(sentence);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    picked.push(ensureSentenceEnding(sentence));
  }

  if (picked.length < 2) {
    for (const sentence of sourceSentences) {
      const normalized = normalizeSentence(sentence);

      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      picked.push(ensureSentenceEnding(sentence));

      if (picked.length >= 3) {
        break;
      }
    }
  }

  const summary = picked.slice(0, 4).join(" ").trim();

  if (summary) {
    return summary;
  }

  const fallback = sourceContents.find((content) => content.trim())?.trim() ?? "";
  return ensureSentenceEnding(fallback.slice(0, 220));
}

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function sameIdOrder(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export async function getSummaryForBranch(input: SummaryRequest): Promise<SummaryResponse> {
  await connectToDatabase();

  const canvasId = toObjectId(input.canvasId, "canvasId");
  const baseNodeId = toObjectId(input.baseNodeId, "baseNodeId");

  const [canvas, baseNode] = await Promise.all([
    CanvasModel.findById(canvasId),
    NodeModel.findById(baseNodeId)
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
      })
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

  const existingSummary = await SummaryModel.findOne({ canvasId, baseNodeId }).sort({ updatedAt: -1 });

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

  const summaryText = buildMockSummary(sourceContents);
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
  );

  if (!savedSummary) {
    throw new Error("Could not persist summary.");
  }

  return {
    status: "ready",
    source: "mock",
    summary: serializeSummary(savedSummary),
    meta
  };
}

