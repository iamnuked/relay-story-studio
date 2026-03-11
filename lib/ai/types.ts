import type { SummarySnapshot } from "@/lib/types/domain";

export type SummaryRequest = {
  canvasId: string;
  baseNodeId: string;
};

export type SummaryMeta = {
  sourceNodeCount: number;
  sourceCharCount: number;
  hiddenByDefault: true;
};

export type SummaryReadyResponse = {
  status: "ready";
  source: "cache" | "openai";
  summary: SummarySnapshot;
  meta: SummaryMeta;
};

export type SummaryNotNeededResponse = {
  status: "not_needed";
  source: null;
  summary: null;
  meta: SummaryMeta;
};

export type SummaryResponse = SummaryReadyResponse | SummaryNotNeededResponse;
