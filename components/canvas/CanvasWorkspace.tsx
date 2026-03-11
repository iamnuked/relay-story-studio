"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { SummaryDisclosure } from "@/components/ai/SummaryDisclosure";
import { MediaPicker } from "@/components/media/MediaPicker";
import type { MediaAsset } from "@/lib/media/types";
import { createCanvasNode, persistNodePosition } from "./canvasApi";
import styles from "./CanvasWorkspace.module.css";
import { CanvasWorkspaceData, CanvasWorkspaceNode } from "./types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 128;
const MINIMAP_WIDTH = 252;
const MINIMAP_HEIGHT = 152;
const MINIMAP_PADDING_X = 14;
const MINIMAP_PADDING_Y = 14;
const MIN_CHILD_X_GAP = 36;
const WORLD_PADDING_LEFT = 960;
const WORLD_PADDING_RIGHT = 1560;
const WORLD_PADDING_TOP = 620;
const WORLD_PADDING_BOTTOM = 960;
const WORLD_MIN_WIDTH = 5200;
const WORLD_MIN_HEIGHT = 3200;

type CanvasWorkspaceProps = {
  detail: CanvasWorkspaceData;
};

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
} | null;

type PanState = {
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
} | null;

type ViewportState = {
  scrollLeft: number;
  scrollTop: number;
  width: number;
  height: number;
};

export function CanvasWorkspace({ detail }: CanvasWorkspaceProps) {
  const [nodes, setNodes] = useState(detail.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState(detail.nodes[0]?.id ?? "");
  const [writeOpen, setWriteOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [endingChecked, setEndingChecked] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [dragState, setDragState] = useState<DragState>(null);
  const [panState, setPanState] = useState<PanState>(null);
  const [miniMapDragging, setMiniMapDragging] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    scrollLeft: 0,
    scrollTop: 0,
    width: 0,
    height: 0,
  });
  const nodesRef = useRef(nodes);
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const canvasInnerRef = useRef<HTMLDivElement | null>(null);
  const miniMapFrameRef = useRef<HTMLDivElement | null>(null);
  const initializedViewportRef = useRef(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];
  const rootNode = nodes.find((node) => node.parentNodeId === null) ?? nodes[0];
  const viewerMode = detail.viewer ? "authenticated" : "anonymous";
  const shareHref = `/canvas/${detail.canvas.shareKey}`;
  const readHref =
    selectedNode && selectedNode.isEnding ? `/read/${detail.canvas.shareKey}/${selectedNode.id}` : null;

  const bounds = getContentBounds(nodes);
  const worldOffsetX = WORLD_PADDING_LEFT - bounds.minX;
  const worldOffsetY = WORLD_PADDING_TOP - bounds.minY;
  const worldMinWidth = Math.max(WORLD_MIN_WIDTH, Math.ceil(viewport.width * 3.4));
  const worldMinHeight = Math.max(WORLD_MIN_HEIGHT, Math.ceil(viewport.height * 3.1));
  const canvasWidth = Math.max(
    worldMinWidth,
    bounds.maxX - bounds.minX + WORLD_PADDING_LEFT + WORLD_PADDING_RIGHT,
  );
  const canvasHeight = Math.max(
    worldMinHeight,
    bounds.maxY - bounds.minY + WORLD_PADDING_TOP + WORLD_PADDING_BOTTOM,
  );
  const activeDragNode = dragState ? nodes.find((node) => node.id === dragState.nodeId) ?? null : null;
  const activeParentNode =
    activeDragNode?.parentNodeId
      ? nodes.find((node) => node.id === activeDragNode.parentNodeId) ?? null
      : null;
  const forbiddenBoundaryX = activeParentNode
    ? activeParentNode.position.x + worldOffsetX + NODE_WIDTH + MIN_CHILD_X_GAP
    : null;

  const miniViewportWidth = clamp(
    (viewport.width / canvasWidth) * MINIMAP_WIDTH,
    34,
    MINIMAP_WIDTH,
  );
  const miniViewportHeight = clamp(
    (viewport.height / canvasHeight) * MINIMAP_HEIGHT,
    28,
    MINIMAP_HEIGHT,
  );
  const miniViewportLeft = clamp(
    (viewport.scrollLeft / canvasWidth) * MINIMAP_WIDTH,
    0,
    MINIMAP_WIDTH - miniViewportWidth,
  );
  const miniViewportTop = clamp(
    (viewport.scrollTop / canvasHeight) * MINIMAP_HEIGHT,
    0,
    MINIMAP_HEIGHT - miniViewportHeight,
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const surface = canvasSurfaceRef.current;

    if (!surface) {
      return;
    }

    const activeSurface = surface;

    function updateViewport() {
      setViewport({
        scrollLeft: activeSurface.scrollLeft,
        scrollTop: activeSurface.scrollTop,
        width: activeSurface.clientWidth,
        height: activeSurface.clientHeight,
      });
    }

    updateViewport();
    activeSurface.addEventListener("scroll", updateViewport, { passive: true });
    window.addEventListener("resize", updateViewport);

    return () => {
      activeSurface.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    const surface = canvasSurfaceRef.current;

    if (!surface || !rootNode || initializedViewportRef.current) {
      return;
    }

    const rootRenderX = rootNode.position.x + worldOffsetX;
    const rootRenderY = rootNode.position.y + worldOffsetY;

    surface.scrollTo({
      left: Math.max(0, rootRenderX - surface.clientWidth * 0.34),
      top: Math.max(0, rootRenderY - surface.clientHeight * 0.22),
    });
    initializedViewportRef.current = true;
  }, [rootNode, worldOffsetX, worldOffsetY]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const activeDragState = dragState;
    const dragStartNode = nodesRef.current.find((node) => node.id === activeDragState.nodeId) ?? null;
    const dragParentNode = dragStartNode?.parentNodeId
      ? nodesRef.current.find((node) => node.id === dragStartNode.parentNodeId) ?? null
      : null;
    const minAllowedX = dragParentNode
      ? dragParentNode.position.x + NODE_WIDTH + MIN_CHILD_X_GAP
      : 60;

    function handlePointerMove(event: PointerEvent) {
      const pointer = getCanvasPointerPosition(event, canvasInnerRef.current);

      if (!pointer) {
        return;
      }

      event.preventDefault();
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === activeDragState.nodeId
            ? {
                ...node,
                position: {
                  x: Math.max(minAllowedX, pointer.x - worldOffsetX - activeDragState.offsetX),
                  y: Math.max(80, pointer.y - worldOffsetY - activeDragState.offsetY),
                },
              }
            : node,
        ),
      );
    }

    async function handlePointerUp() {
      const movedNode = nodesRef.current.find((node) => node.id === activeDragState.nodeId);

      if (movedNode && viewerMode === "authenticated") {
        try {
          const result = await persistNodePosition(movedNode.id, movedNode.position);

          setNodes((currentNodes) =>
            currentNodes.map((node) => (node.id === result.node.id ? result.node : node)),
          );
        } catch (error) {
          setSubmitMessage(error instanceof Error ? error.message : "Could not save node position.");
        }
      }

      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, viewerMode, worldOffsetX, worldOffsetY]);

  useEffect(() => {
    if (!panState) {
      return;
    }

    const activePanState = panState;

    function handlePointerMove(event: PointerEvent) {
      const surface = canvasSurfaceRef.current;

      if (!surface) {
        return;
      }

      event.preventDefault();
      surface.scrollLeft =
        activePanState.startScrollLeft - (event.clientX - activePanState.startClientX);
      surface.scrollTop =
        activePanState.startScrollTop - (event.clientY - activePanState.startClientY);
    }

    function handlePointerUp() {
      setPanState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panState]);

  useEffect(() => {
    if (!miniMapDragging) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      scrollViewportFromMinimap(
        event.clientX,
        event.clientY,
        canvasSurfaceRef.current,
        miniMapFrameRef.current,
        canvasWidth,
        canvasHeight,
      );
    }

    function handlePointerUp() {
      setMiniMapDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [miniMapDragging, canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setWriteOpen(false);
      setControlsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!selectedNode) {
    return (
      <main className={styles.page}>
        <section className={styles.workspace}>
          <div className={styles.emptyState}>
            <span className={styles.eyebrow}>Canvas workspace</span>
            <h1 className={styles.title}>{detail.canvas.title}</h1>
            <p className={styles.subtitle}>No nodes were returned for this canvas yet.</p>
          </div>
        </section>
      </main>
    );
  }

  function clearDraftState() {
    setDraftText("");
    setEndingChecked(false);
    setSelectedAssets([]);
  }

  function resetWritePanelState() {
    setWriteOpen(false);
    clearDraftState();
  }

  function handleSelect(node: CanvasWorkspaceNode) {
    if (node.id !== selectedNodeId) {
      clearDraftState();
    }

    setSelectedNodeId(node.id);
    setWriteOpen(false);
    setSubmitMessage(null);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("[data-no-pan='true']")) {
      return;
    }

    const surface = canvasSurfaceRef.current;

    if (!surface) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: surface.scrollLeft,
      startScrollTop: surface.scrollTop,
    });
  }

  function handleMiniMapPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    scrollViewportFromMinimap(
      event.clientX,
      event.clientY,
      canvasSurfaceRef.current,
      miniMapFrameRef.current,
      canvasWidth,
      canvasHeight,
    );
    setMiniMapDragging(true);
  }

  function handlePointerDown(node: CanvasWorkspaceNode, event: ReactPointerEvent<HTMLButtonElement>) {
    if (viewerMode !== "authenticated") {
      return;
    }

    const pointer = getCanvasPointerPosition(event.nativeEvent, canvasInnerRef.current);

    if (!pointer) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (node.id !== selectedNodeId) {
      clearDraftState();
    }

    setSelectedNodeId(node.id);
    setWriteOpen(false);
    setDragState({
      nodeId: node.id,
      offsetX: pointer.x - worldOffsetX - node.position.x,
      offsetY: pointer.y - worldOffsetY - node.position.y,
    });
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handlePublish() {
    if (!selectedNode) {
      return;
    }

    if (!draftText.trim()) {
      setSubmitMessage("Write the next node content before publishing.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const siblingCount = nodes.filter((node) => node.parentNodeId === selectedNode.id).length;
      const nextPosition = {
        x: selectedNode.position.x + 320,
        y: selectedNode.position.y + siblingCount * 180 - (siblingCount > 0 ? 90 : 0),
      };

      const result = await createCanvasNode({
        canvasId: detail.canvas.id,
        parentNodeId: selectedNode.id,
        content: draftText.trim(),
        position: nextPosition,
        imageAssetIds: selectedAssets.map((asset) => asset.id),
        isEnding: endingChecked,
      });

      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes, result.node];

        if (result.autoEndingNode) {
          nextNodes.push(result.autoEndingNode);
        }

        return nextNodes;
      });

      setSelectedNodeId(result.autoEndingNode?.id ?? result.node.id);
      resetWritePanelState();
      setSubmitMessage(
        result.autoEndingNode
          ? "Node published and the branch auto-completed at max depth."
          : "Node published.",
      );
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "Could not publish the next node.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <div
          className={`${styles.canvasSurface} ${panState ? styles.canvasSurfacePanning : ""}`}
          ref={canvasSurfaceRef}
          onPointerDown={handleCanvasPointerDown}
        >
          <div
            className={styles.canvasInner}
            ref={canvasInnerRef}
            style={{ width: canvasWidth, height: canvasHeight }}
          >
            {forbiddenBoundaryX ? (
              <div className={styles.constraintZone} style={{ width: forbiddenBoundaryX }}>
                <div className={styles.constraintLabel}>
                  Branch nodes cannot move left of their parent.
                </div>
              </div>
            ) : null}

            <svg className={styles.edgeLayer}>
              {nodes
                .filter((node) => node.parentNodeId)
                .map((node) => {
                  const source = nodes.find((candidate) => candidate.id === node.parentNodeId);

                  if (!source) {
                    return null;
                  }

                  const sourceX = source.position.x + worldOffsetX + NODE_WIDTH;
                  const sourceY = source.position.y + worldOffsetY + NODE_HEIGHT / 2;
                  const targetX = node.position.x + worldOffsetX;
                  const targetY = node.position.y + worldOffsetY + NODE_HEIGHT / 2;
                  const deltaX = (targetX - sourceX) / 2;
                  const path = `M ${sourceX} ${sourceY} C ${sourceX + deltaX} ${sourceY}, ${targetX - deltaX} ${targetY}, ${targetX} ${targetY}`;

                  return <path key={`${source.id}-${node.id}`} className={styles.edgePath} d={path} />;
                })}
            </svg>

            {nodes.map((node) => {
              const typeLabel = getNodeTypeLabel(node);

              return (
                <button
                  key={node.id}
                  className={[
                    styles.nodeCard,
                    selectedNodeId === node.id ? styles.nodeSelected : "",
                    node.isEnding ? styles.nodeEnding : "",
                    node.endingType === "auto-max-depth" ? styles.nodeAutoEnding : "",
                  ].join(" ")}
                  data-no-pan="true"
                  onClick={() => handleSelect(node)}
                  onPointerDown={(event) => handlePointerDown(node, event)}
                  style={{
                    left: node.position.x + worldOffsetX,
                    top: node.position.y + worldOffsetY,
                  }}
                  type="button"
                >
                  <span className={styles.nodeType}>{typeLabel}</span>
                  <h2 className={styles.nodeTitle}>{getNodeHeading(node)}</h2>
                  <p className={styles.nodeExcerpt}>{getExcerpt(node.content)}</p>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.drawer}>
          <div className={styles.drawerContent} data-no-pan="true">
            <span className={styles.sectionLabel}>Selected node</span>
            <h2 className={styles.drawerTitle}>{getNodeHeading(selectedNode)}</h2>
            <div className={styles.metaRow}>
              {getNodeTypeLabel(selectedNode)} · {selectedNode.createdAt}
            </div>
            <p className={styles.bodyCopy}>{selectedNode.content}</p>
            <div className={styles.buttonRow}>
              {selectedNode.isEnding ? (
                <a className={styles.tertiaryButton} href={readHref ?? shareHref}>
                  Open reader
                </a>
              ) : viewerMode === "authenticated" ? (
                <button
                  className={styles.primaryButton}
                  onClick={() => setWriteOpen(true)}
                  type="button"
                >
                  Write next node
                </button>
              ) : (
                <a className={styles.primaryButton} href={`/login?next=${encodeURIComponent(shareHref)}`}>
                  Login to write
                </a>
              )}
            </div>

            {submitMessage && !writeOpen ? <p className={styles.helperText}>{submitMessage}</p> : null}
          </div>
        </aside>

        <section className={styles.miniMap} data-no-pan="true">
          <div className={styles.miniMapChrome}>
            <h2 className={styles.miniMapTitle}>Navigator</h2>
            <p className={styles.miniCaption}>Click or drag inside this map to move the camera.</p>
          </div>
          <div
            className={styles.miniMapFrame}
            onPointerDown={handleMiniMapPointerDown}
            ref={miniMapFrameRef}
          >
            {nodes.map((node) => (
              <div
                key={`mini-${node.id}`}
                className={styles.miniNode}
                style={{
                  left:
                    MINIMAP_PADDING_X +
                    ((node.position.x + worldOffsetX) / canvasWidth) * MINIMAP_WIDTH,
                  top:
                    MINIMAP_PADDING_Y +
                    ((node.position.y + worldOffsetY) / canvasHeight) * MINIMAP_HEIGHT,
                }}
              />
            ))}
            <div
              className={styles.miniViewport}
              style={{
                left: MINIMAP_PADDING_X + miniViewportLeft,
                top: MINIMAP_PADDING_Y + miniViewportTop,
                width: miniViewportWidth,
                height: miniViewportHeight,
              }}
            />
          </div>
        </section>

        <div className={styles.controlDock} data-no-pan="true">
          {controlsOpen ? (
            <div className={styles.controlPanel}>
              <div className={styles.controlHeader}>
                <div>
                  <span className={styles.sectionLabel}>Canvas menu</span>
                  <h2 className={styles.controlTitle}>{detail.canvas.title}</h2>
                </div>
                <button
                  className={styles.controlToggle}
                  onClick={() => setControlsOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className={styles.controlActions}>
                <button className={styles.pill} onClick={handleCopyLink} type="button">
                  {copied ? "Link copied" : "Copy share link"}
                </button>
                {readHref ? (
                  <a className={styles.primaryPill} href={readHref}>
                    Read branch
                  </a>
                ) : (
                  <span className={styles.statusPill}>Select an ending node to open the reader.</span>
                )}
                <span className={styles.statusPill}>
                  {viewerMode === "authenticated"
                    ? `Logged in as ${detail.viewer?.nickname ?? "writer"}`
                    : "Guest mode: read only"}
                </span>
              </div>
            </div>
          ) : null}

          <button
            className={styles.controlDockButton}
            onClick={() => setControlsOpen((current) => !current)}
            type="button"
          >
            {controlsOpen ? "Hide canvas menu" : "Open canvas menu"}
          </button>
        </div>

        {writeOpen && viewerMode === "authenticated" ? (
          <div
            className={styles.composerOverlay}
            data-no-pan="true"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setWriteOpen(false);
              }
            }}
          >
            <section className={styles.composerPanel}>
              <div className={styles.composerHeader}>
                <div>
                  <span className={styles.sectionLabel}>Write next node</span>
                  <h2 className={styles.composerTitle}>Continue from {getNodeHeading(selectedNode)}</h2>
                </div>
                <button
                  className={styles.controlToggle}
                  onClick={() => setWriteOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className={styles.composerGrid}>
                <aside className={styles.composerSidebar}>
                  <label className={styles.fieldLabel}>Parent context</label>
                  <div className={styles.contextBox}>{selectedNode.content}</div>

                  <SummaryDisclosure baseNodeId={selectedNode.id} canvasId={detail.canvas.id} />
                </aside>

                <div className={styles.composerMain}>
                  <label className={styles.fieldLabel} htmlFor="story-draft">
                    Story content
                  </label>
                  <textarea
                    className={styles.composerTextarea}
                    id="story-draft"
                    onChange={(event) => setDraftText(event.target.value)}
                    placeholder="Continue the story from the selected node..."
                    value={draftText}
                  />

                  <MediaPicker
                    baseNodeId={selectedNode.id}
                    canvasId={detail.canvas.id}
                    disabled={isSubmitting}
                    onChange={setSelectedAssets}
                    selectedAssets={selectedAssets}
                  />

                  <div className={styles.inlineTools}>
                    <label className={styles.checkboxRow}>
                      <input
                        checked={endingChecked}
                        onChange={(event) => setEndingChecked(event.target.checked)}
                        type="checkbox"
                      />
                      Mark this node as ending
                    </label>
                  </div>

                  <p className={styles.helperText}>
                    Summaries stay collapsed until requested. Draft media stays detached until publish succeeds.
                  </p>
                </div>
              </div>

              <div className={styles.composerFooter}>
                <span className={styles.helperText}>
                  {submitMessage ?? "Draft locally here, then publish once the branch feels right."}
                </span>
                <div className={styles.buttonRow}>
                  <button className={styles.secondaryButton} onClick={() => setWriteOpen(false)} type="button">
                    Cancel
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={isSubmitting}
                    onClick={handlePublish}
                    type="button"
                  >
                    {isSubmitting ? "Publishing..." : "Confirm and publish"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getCanvasPointerPosition(event: PointerEvent, canvasInner: HTMLDivElement | null) {
  if (!canvasInner) {
    return null;
  }

  const rect = canvasInner.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function getNodeHeading(node: CanvasWorkspaceNode) {
  if (node.parentNodeId === null) {
    return "Root node";
  }

  if (node.isEnding && node.endingType === "auto-max-depth") {
    return "Auto ending";
  }

  if (node.isEnding) {
    return "Ending node";
  }

  return "Story node";
}

function getNodeTypeLabel(node: CanvasWorkspaceNode) {
  if (node.parentNodeId === null) {
    return "Root";
  }

  if (node.isEnding && node.endingType === "auto-max-depth") {
    return "Auto ending";
  }

  if (node.isEnding) {
    return "Ending";
  }

  return "Branch";
}

function getExcerpt(content: string) {
  return content.length > 96 ? `${content.slice(0, 96)}...` : content;
}

function getContentBounds(nodes: CanvasWorkspaceNode[]) {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: NODE_WIDTH,
      maxY: NODE_HEIGHT,
    };
  }

  return nodes.reduce(
    (bounds, node) => ({
      minX: Math.min(bounds.minX, node.position.x),
      minY: Math.min(bounds.minY, node.position.y),
      maxX: Math.max(bounds.maxX, node.position.x + NODE_WIDTH),
      maxY: Math.max(bounds.maxY, node.position.y + NODE_HEIGHT),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function scrollViewportFromMinimap(
  clientX: number,
  clientY: number,
  surface: HTMLDivElement | null,
  frame: HTMLDivElement | null,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (!surface || !frame) {
    return;
  }

  const rect = frame.getBoundingClientRect();
  const localX = clamp(clientX - rect.left - MINIMAP_PADDING_X, 0, MINIMAP_WIDTH);
  const localY = clamp(clientY - rect.top - MINIMAP_PADDING_Y, 0, MINIMAP_HEIGHT);
  const targetLeft = (localX / MINIMAP_WIDTH) * canvasWidth - surface.clientWidth / 2;
  const targetTop = (localY / MINIMAP_HEIGHT) * canvasHeight - surface.clientHeight / 2;

  surface.scrollTo({
    left: clamp(targetLeft, 0, Math.max(0, canvasWidth - surface.clientWidth)),
    top: clamp(targetTop, 0, Math.max(0, canvasHeight - surface.clientHeight)),
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
