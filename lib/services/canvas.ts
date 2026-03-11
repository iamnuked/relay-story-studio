import { ClientSession, Types } from "mongoose";
import { withTransaction } from "@/lib/db/transaction";
import { connectToDatabase } from "@/lib/db/mongoose";
import { badRequest, notFound } from "@/lib/server/errors";
import type {
  CreateCanvasRequest,
  CreateCanvasResponse,
  CreateNodeRequest,
  CreateNodeResponse,
  UpdateNodePositionRequest
} from "@/lib/types/api";
import type { AuthSession } from "@/lib/types/auth";
import type { CanvasDetail, NodePosition, ParticipatedCanvas } from "@/lib/types/domain";
import { serializeCanvas, serializeNode, serializeParticipationCanvas } from "@/lib/utils/serializers";
import { generateShareKey } from "@/lib/utils/share-key";
import { toObjectId } from "@/lib/utils/object-id";
import { AssetModel, CanvasModel, NodeModel, ParticipationModel } from "@/models";

const DEFAULT_MAX_USER_NODES = 12;
const MAX_ALLOWED_USER_NODES = 50;
const AUTO_ENDING_COPY = "This branch has reached the relay limit and closes here.";

function assertTitle(title: string) {
  const value = title.trim();

  if (value.length < 3 || value.length > 80) {
    throw badRequest("Title must be between 3 and 80 characters.");
  }

  return value;
}

function assertContent(content: string) {
  const value = content.trim();

  if (value.length < 1 || value.length > 4000) {
    throw badRequest("Content must be between 1 and 4000 characters.");
  }

  return value;
}

function assertMaxUserNodes(maxUserNodesPerBranch?: number) {
  const value = maxUserNodesPerBranch ?? DEFAULT_MAX_USER_NODES;

  if (!Number.isInteger(value) || value < 1 || value > MAX_ALLOWED_USER_NODES) {
    throw badRequest(`maxUserNodesPerBranch must be an integer between 1 and ${MAX_ALLOWED_USER_NODES}.`);
  }

  return value;
}

function assertPosition(position?: NodePosition): NodePosition {
  const value = position ?? { x: 0, y: 0 };

  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw badRequest("Position coordinates must be finite numbers.");
  }

  return value;
}

function assertImageAssetIds(imageAssetIds?: string[]) {
  const ids = imageAssetIds ?? [];

  if (!Array.isArray(ids)) {
    throw badRequest("imageAssetIds must be an array of ObjectId strings.");
  }

  return ids.map((id) => toObjectId(id, "imageAssetIds[]"));
}

async function assertPublishableImageAssets(
  imageAssetIds: Types.ObjectId[],
  canvasId: Types.ObjectId,
  userId: Types.ObjectId,
  session: ClientSession | null
) {
  if (imageAssetIds.length === 0) {
    return;
  }

  const assets = session
    ? await AssetModel.find({ _id: { $in: imageAssetIds } }).session(session)
    : await AssetModel.find({ _id: { $in: imageAssetIds } });

  if (assets.length !== imageAssetIds.length) {
    throw badRequest("Each selected image must exist before publishing.");
  }

  const assetMap = new Map(assets.map((asset) => [asset._id.toString(), asset]));

  for (const assetId of imageAssetIds) {
    const asset = assetMap.get(assetId.toString());

    if (!asset) {
      throw badRequest("Each selected image must exist before publishing.");
    }

    if (asset.canvasId.toString() !== canvasId.toString()) {
      throw badRequest("Selected images must belong to the same canvas.");
    }

    if (asset.createdBy.toString() !== userId.toString()) {
      throw badRequest("You can only attach images you created.");
    }

    if (asset.nodeId) {
      throw badRequest("Selected images are already attached to another node.");
    }
  }
}

async function attachImageAssetsToNode(
  imageAssetIds: Types.ObjectId[],
  nodeId: Types.ObjectId,
  session: ClientSession | null
) {
  if (imageAssetIds.length === 0) {
    return;
  }

  await AssetModel.updateMany(
    { _id: { $in: imageAssetIds } },
    {
      $set: {
        nodeId
      }
    },
    session ? { session } : undefined
  );
}
async function generateUniqueShareKey(session: ClientSession | null) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const shareKey = generateShareKey();
    const existingCanvas = session
      ? await CanvasModel.exists({ shareKey }).session(session)
      : await CanvasModel.exists({ shareKey });

    if (!existingCanvas) {
      return shareKey;
    }
  }

  throw new Error("Could not generate a unique share key.");
}

async function touchParticipation(
  canvasId: Types.ObjectId,
  userId: Types.ObjectId,
  lastContributedAt: Date | null
) {
  const now = new Date();

  await ParticipationModel.updateOne(
    { canvasId, userId },
    {
      $set: {
        lastVisitedAt: now,
        ...(lastContributedAt ? { lastContributedAt } : {})
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );
}

async function createAutoEndingNode(
  canvasId: Types.ObjectId,
  parentNodeId: Types.ObjectId,
  ancestorIds: Types.ObjectId[],
  depth: number,
  position: NodePosition,
  createdBy: Types.ObjectId,
  userNodeCountInPath: number,
  session: ClientSession | null
) {
  const [autoEndingNode] = await NodeModel.create(
    [
      {
        canvasId,
        parentNodeId,
        ancestorIds,
        depth,
        userNodeCountInPath,
        content: AUTO_ENDING_COPY,
        isEnding: true,
        endingType: "auto-max-depth",
        nodeKind: "system",
        imageAssetIds: [],
        position,
        createdBy
      }
    ],
    session ? { session } : undefined
  );

  return autoEndingNode;
}

export async function createCanvasWithRoot(
  userId: string,
  input: CreateCanvasRequest
): Promise<CreateCanvasResponse> {
  const title = assertTitle(input.title);
  const rootContent = assertContent(input.rootContent);
  const maxUserNodesPerBranch = assertMaxUserNodes(input.maxUserNodesPerBranch);
  const rootPosition = assertPosition(input.rootPosition);
  const creatorId = toObjectId(userId, "userId");

  const result = await withTransaction(async (session) => {
    const canvasId = new Types.ObjectId();
    const rootNodeId = new Types.ObjectId();
    const shareKey = await generateUniqueShareKey(session);

    const [canvas] = await CanvasModel.create(
      [
        {
          _id: canvasId,
          title,
          rootNodeId,
          maxUserNodesPerBranch,
          creatorId,
          shareKey
        }
      ],
      session ? { session } : undefined
    );

    const [rootNode] = await NodeModel.create(
      [
        {
          _id: rootNodeId,
          canvasId,
          parentNodeId: null,
          ancestorIds: [],
          depth: 0,
          userNodeCountInPath: 1,
          content: rootContent,
          isEnding: false,
          endingType: null,
          nodeKind: "user",
          imageAssetIds: [],
          position: rootPosition,
          createdBy: creatorId
        }
      ],
      session ? { session } : undefined
    );

    await ParticipationModel.create(
      [
        {
          canvasId,
          userId: creatorId,
          lastVisitedAt: new Date(),
          lastContributedAt: new Date()
        }
      ],
      session ? { session } : undefined
    );

    let autoEndingNode = null;

    if (maxUserNodesPerBranch === 1) {
      autoEndingNode = await createAutoEndingNode(
        canvasId,
        rootNodeId,
        [rootNodeId],
        1,
        {
          x: rootPosition.x + 320,
          y: rootPosition.y + 180
        },
        creatorId,
        1,
        session
      );
    }

    return {
      canvas,
      rootNode,
      autoEndingNode
    };
  });

  return {
    canvas: serializeCanvas(result.canvas),
    rootNode: serializeNode(result.rootNode),
    autoEndingNode: result.autoEndingNode ? serializeNode(result.autoEndingNode) : null
  };
}

export async function listParticipatedCanvases(userId: string): Promise<ParticipatedCanvas[]> {
  await connectToDatabase();

  const userObjectId = toObjectId(userId, "userId");
  const participations = await ParticipationModel.find({ userId: userObjectId }).sort({
    lastVisitedAt: -1
  });

  if (participations.length === 0) {
    return [];
  }

  const canvases = await CanvasModel.find({
    _id: { $in: participations.map((participation) => participation.canvasId) }
  });

  const canvasMap = new Map(canvases.map((canvas) => [canvas._id.toString(), canvas]));

  return participations.flatMap((participation) => {
    const canvas = canvasMap.get(participation.canvasId.toString());

    return canvas ? [serializeParticipationCanvas(canvas, participation)] : [];
  });
}

export async function getCanvasDetailByShareKey(
  shareKey: string,
  viewer: AuthSession | null
): Promise<CanvasDetail> {
  await connectToDatabase();

  const canvas = await CanvasModel.findOne({ shareKey });

  if (!canvas) {
    throw notFound("Canvas not found for that share key.");
  }

  const nodes = await NodeModel.find({ canvasId: canvas._id }).sort({
    depth: 1,
    createdAt: 1
  });

  if (viewer) {
    await touchParticipation(canvas._id, toObjectId(viewer.userId, "viewer.userId"), null);
  }

  return {
    canvas: serializeCanvas(canvas),
    nodes: nodes.map(serializeNode),
    viewer
  };
}

export async function createNode(
  userId: string,
  input: CreateNodeRequest
): Promise<CreateNodeResponse> {
  const canvasId = toObjectId(input.canvasId, "canvasId");
  const parentNodeId = toObjectId(input.parentNodeId, "parentNodeId");
  const content = assertContent(input.content);
  const position = assertPosition(input.position);
  const imageAssetIds = assertImageAssetIds(input.imageAssetIds);
  const createdBy = toObjectId(userId, "userId");
  const isEnding = Boolean(input.isEnding);

  const result = await withTransaction(async (session) => {
    const canvas = session
      ? await CanvasModel.findById(canvasId).session(session)
      : await CanvasModel.findById(canvasId);

    if (!canvas) {
      throw notFound("Canvas not found.");
    }

    const parentNode = session
      ? await NodeModel.findById(parentNodeId).session(session)
      : await NodeModel.findById(parentNodeId);

    if (!parentNode || parentNode.canvasId.toString() !== canvas._id.toString()) {
      throw badRequest("Parent node must exist inside the requested canvas.");
    }

    if (parentNode.isEnding) {
      throw badRequest("Cannot add a child under an ending node.");
    }

    const nextUserNodeCount = parentNode.userNodeCountInPath + 1;

    if (nextUserNodeCount > canvas.maxUserNodesPerBranch) {
      throw badRequest("This branch already reached the maximum number of user-written nodes.");
    }

    await assertPublishableImageAssets(imageAssetIds, canvas._id, createdBy, session);

    const [node] = await NodeModel.create(
      [
        {
          canvasId: canvas._id,
          parentNodeId: parentNode._id,
          ancestorIds: [...parentNode.ancestorIds, parentNode._id],
          depth: parentNode.depth + 1,
          userNodeCountInPath: nextUserNodeCount,
          content,
          isEnding,
          endingType: isEnding ? "manual" : null,
          nodeKind: "user",
          imageAssetIds,
          position,
          createdBy
        }
      ],
      session ? { session } : undefined
    );

    await attachImageAssetsToNode(imageAssetIds, node._id, session);

    await ParticipationModel.updateOne(
      { canvasId: canvas._id, userId: createdBy },
      {
        $set: {
          lastVisitedAt: new Date(),
          lastContributedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      session ? { upsert: true, session } : { upsert: true }
    );

    let autoEndingNode = null;

    if (!isEnding && nextUserNodeCount === canvas.maxUserNodesPerBranch) {
      autoEndingNode = await createAutoEndingNode(
        canvas._id,
        node._id,
        [...node.ancestorIds, node._id],
        node.depth + 1,
        {
          x: position.x + 320,
          y: position.y + 180
        },
        createdBy,
        node.userNodeCountInPath,
        session
      );
    }

    return {
      node,
      autoEndingNode
    };
  });

  return {
    node: serializeNode(result.node),
    autoEndingNode: result.autoEndingNode ? serializeNode(result.autoEndingNode) : null
  };
}

export async function updateNodePosition(
  userId: string,
  nodeId: string,
  input: UpdateNodePositionRequest
) {
  await connectToDatabase();

  const targetNodeId = toObjectId(nodeId, "nodeId");
  const viewerId = toObjectId(userId, "userId");
  const position = assertPosition(input.position);

  const node = await NodeModel.findByIdAndUpdate(
    targetNodeId,
    {
      $set: {
        position
      }
    },
    {
      new: true
    }
  );

  if (!node) {
    throw notFound("Node not found.");
  }

  await touchParticipation(node.canvasId, viewerId, null);

  return {
    node: serializeNode(node)
  };
}



