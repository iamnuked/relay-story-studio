import { CanvasWorkspaceData } from "./types";

type PositionPayload = {
  x: number;
  y: number;
};

export async function persistNodePosition(nodeId: string, position: PositionPayload) {
  try {
    await fetch(`/api/nodes/${nodeId}/position`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ position }),
    });
  } catch {
    // Role 1 will provide the real persistence endpoint.
  }
}

export async function fetchSharedCanvas(shareKey: string): Promise<CanvasWorkspaceData | null> {
  try {
    const response = await fetch(`/api/canvases/${shareKey}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CanvasWorkspaceData;
  } catch {
    return null;
  }
}
