import type { MediaAsset } from "@/lib/media/types";
import type { AuthSession } from "@/lib/types/auth";

export type NodeKind = "user" | "system";
export type EndingType = "manual" | "auto-max-depth" | null;

export type NodePosition = {
  x: number;
  y: number;
};

export type Canvas = {
  id: string;
  title: string;
  rootNodeId: string;
  maxUserNodesPerBranch: number;
  creatorId: string;
  shareKey: string;
  createdAt: string;
  updatedAt: string;
};

export type Node = {
  id: string;
  canvasId: string;
  parentNodeId: string | null;
  ancestorIds: string[];
  depth: number;
  userNodeCountInPath: number;
  content: string;
  isEnding: boolean;
  endingType: EndingType;
  nodeKind: NodeKind;
  imageAssetIds: string[];
  position: NodePosition;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ParticipatedCanvas = Canvas & {
  lastVisitedAt: string;
  lastContributedAt: string | null;
};

export type SummarySnapshot = {
  id: string;
  canvasId: string;
  baseNodeId: string;
  summaryText: string;
  sourceNodeIds: string[];
  estimatedTokenCount: number;
  createdAt: string;
};

export type ReaderBranch = {
  canvas: Canvas;
  nodes: Node[];
  endingNodeId: string;
  summary: SummarySnapshot | null;
};

export type ReaderSegment =
  | {
      nodeId: string;
      kind: "text";
      text: string;
    }
  | {
      nodeId: string;
      kind: "image";
      imageUrl: string;
      imageAlt: string;
    };

export type ReaderBranchContent = {
  canvas: Pick<Canvas, "id" | "title" | "shareKey">;
  endingNodeId: string;
  endingType: Exclude<EndingType, null>;
  sharePath: string;
  segments: ReaderSegment[];
};

export type CanvasDetail = {
  canvas: Canvas;
  nodes: Node[];
  assets: MediaAsset[];
  viewer: AuthSession | null;
};
