import { Types } from "mongoose";
import type { AuthUser } from "@/lib/types/auth";
import type { Canvas, Node, ParticipatedCanvas, SummarySnapshot } from "@/lib/types/domain";
import type {
  AssetDocument,
  CanvasDocument,
  DraftDocument,
  NodeDocument,
  ParticipationDocument,
  SummaryDocument,
  UserDocument
} from "@/models";

function idToString(value: Types.ObjectId | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.toString();
}

export function serializeUser(user: UserDocument): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt.toISOString()
  };
}

export function serializeCanvas(canvas: CanvasDocument): Canvas {
  return {
    id: canvas._id.toString(),
    title: canvas.title,
    rootNodeId: canvas.rootNodeId.toString(),
    maxUserNodesPerBranch: canvas.maxUserNodesPerBranch,
    creatorId: canvas.creatorId.toString(),
    shareKey: canvas.shareKey,
    createdAt: canvas.createdAt.toISOString(),
    updatedAt: canvas.updatedAt.toISOString()
  };
}

export function serializeNode(node: NodeDocument): Node {
  return {
    id: node._id.toString(),
    canvasId: node.canvasId.toString(),
    parentNodeId: idToString(node.parentNodeId),
    ancestorIds: node.ancestorIds.map((ancestorId) => ancestorId.toString()),
    depth: node.depth,
    userNodeCountInPath: node.userNodeCountInPath,
    content: node.content,
    isEnding: node.isEnding,
    endingType: node.endingType,
    nodeKind: node.nodeKind,
    imageAssetIds: node.imageAssetIds.map((assetId) => assetId.toString()),
    position: {
      x: node.position.x,
      y: node.position.y
    },
    createdBy: node.createdBy.toString(),
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString()
  };
}

export function serializeParticipationCanvas(
  canvas: CanvasDocument,
  participation: ParticipationDocument
): ParticipatedCanvas {
  return {
    ...serializeCanvas(canvas),
    lastVisitedAt: participation.lastVisitedAt.toISOString(),
    lastContributedAt: participation.lastContributedAt
      ? participation.lastContributedAt.toISOString()
      : null
  };
}

export function serializeSummary(summary: SummaryDocument): SummarySnapshot {
  return {
    id: summary._id.toString(),
    canvasId: summary.canvasId.toString(),
    baseNodeId: summary.baseNodeId.toString(),
    summaryText: summary.summaryText,
    sourceNodeIds: summary.sourceNodeIds.map((nodeId) => nodeId.toString()),
    estimatedTokenCount: summary.estimatedTokenCount,
    createdAt: summary.createdAt.toISOString()
  };
}

export type { AssetDocument, DraftDocument };
