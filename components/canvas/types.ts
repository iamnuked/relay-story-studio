export type ViewerMode = "anonymous" | "authenticated";

export type CanvasNodeImage = {
  url: string;
  alt: string;
};

export type CanvasNodeData = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  createdBy: string;
  createdAt: string;
  isEnding: boolean;
  endingType: "user" | "auto_limit" | null;
  position: {
    x: number;
    y: number;
  };
  image?: CanvasNodeImage;
};

export type CanvasEdgeData = {
  id: string;
  sourceId: string;
  targetId: string;
};

export type CanvasWorkspaceData = {
  id: string;
  shareKey: string;
  title: string;
  subtitle: string;
  viewerMode: ViewerMode;
  maxUserNodesPerBranch: number;
  selectedNodeId: string;
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
};
