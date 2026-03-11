"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { persistNodePosition } from "./canvasApi";
import styles from "./CanvasWorkspace.module.css";
import { CanvasNodeData, CanvasWorkspaceData } from "./types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 128;
const MINIMAP_SCALE = 0.16;

type CanvasWorkspaceProps = {
  workspace: CanvasWorkspaceData;
};

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
} | null;

export function CanvasWorkspace({ workspace }: CanvasWorkspaceProps) {
  const [nodes, setNodes] = useState(workspace.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState(workspace.selectedNodeId);
  const [writeOpen, setWriteOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [dragState, setDragState] = useState<DragState>(null);
  const [copied, setCopied] = useState(false);
  const nodesRef = useRef(nodes);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === dragState.nodeId
            ? {
                ...node,
                position: {
                  x: Math.max(60, event.clientX - dragState.offsetX),
                  y: Math.max(160, event.clientY - dragState.offsetY),
                },
              }
            : node,
        ),
      );
    }

    async function handlePointerUp() {
      const movedNode = nodesRef.current.find((node) => node.id === dragState.nodeId);

      if (movedNode && workspace.viewerMode === "authenticated") {
        await persistNodePosition(movedNode.id, movedNode.position);
      }

      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, workspace.viewerMode]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function handleSelect(node: CanvasNodeData) {
    setSelectedNodeId(node.id);
    setWriteOpen(false);
  }

  function handlePointerDown(node: CanvasNodeData, event: ReactPointerEvent<HTMLButtonElement>) {
    if (workspace.viewerMode !== "authenticated") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedNodeId(node.id);
    setWriteOpen(false);
    setDragState({
      nodeId: node.id,
      offsetX: event.clientX - node.position.x,
      offsetY: event.clientY - node.position.y,
    });
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`/canvas/${workspace.shareKey}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const readHref = `/read/${workspace.shareKey}/${selectedNode.id}`;

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <header className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.eyebrow}>Role 2 canvas workspace</span>
            <h1 className={styles.title}>{workspace.title}</h1>
            <p className={styles.subtitle}>{workspace.subtitle}</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.pill} onClick={handleCopyLink} type="button">
              {copied ? "Link copied" : "Copy link"}
            </button>
            {selectedNode.isEnding ? (
              <a className={styles.primaryPill} href={readHref}>
                Read branch
              </a>
            ) : (
              <span className={styles.statusPill}>Select an ending node to read</span>
            )}
            <span className={styles.statusPill}>
              {workspace.viewerMode === "authenticated"
                ? "Logged in: can write and move nodes"
                : "Guest mode: read only, login to write"}
            </span>
          </div>
        </header>

        <div className={styles.canvasSurface}>
          <div className={styles.canvasInner}>
            <svg className={styles.edgeLayer}>
              {workspace.edges.map((edge) => {
                const source = nodes.find((node) => node.id === edge.sourceId);
                const target = nodes.find((node) => node.id === edge.targetId);

                if (!source || !target) {
                  return null;
                }

                const sourceX = source.position.x + NODE_WIDTH;
                const sourceY = source.position.y + NODE_HEIGHT / 2;
                const targetX = target.position.x;
                const targetY = target.position.y + NODE_HEIGHT / 2;
                const deltaX = (targetX - sourceX) / 2;
                const path = `M ${sourceX} ${sourceY} C ${sourceX + deltaX} ${sourceY}, ${targetX - deltaX} ${targetY}, ${targetX} ${targetY}`;

                return <path key={edge.id} className={styles.edgePath} d={path} />;
              })}
            </svg>

            {nodes.map((node) => {
              const typeLabel = node.isEnding
                ? node.endingType === "auto_limit"
                  ? "Auto ending"
                  : "Ending"
                : "Story node";

              return (
                <button
                  key={node.id}
                  className={[
                    styles.nodeCard,
                    selectedNodeId === node.id ? styles.nodeSelected : "",
                    node.isEnding ? styles.nodeEnding : "",
                    node.endingType === "auto_limit" ? styles.nodeAutoEnding : "",
                  ].join(" ")}
                  onClick={() => handleSelect(node)}
                  onPointerDown={(event) => handlePointerDown(node, event)}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                  }}
                  type="button"
                >
                  <span className={styles.nodeType}>{typeLabel}</span>
                  <h2 className={styles.nodeTitle}>{node.title}</h2>
                  <p className={styles.nodeExcerpt}>{node.excerpt}</p>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.drawer}>
          <div className={styles.drawerContent}>
            <span className={styles.sectionLabel}>Selected node</span>
            <h2 className={styles.drawerTitle}>{selectedNode.title}</h2>
            <div className={styles.metaRow}>
              {selectedNode.createdBy} · {selectedNode.createdAt}
            </div>
            <p className={styles.bodyCopy}>{selectedNode.body}</p>
            <div className={styles.buttonRow}>
              {selectedNode.isEnding ? (
                <a className={styles.tertiaryButton} href={readHref}>
                  Open reader
                </a>
              ) : workspace.viewerMode === "authenticated" ? (
                <button
                  className={styles.primaryButton}
                  onClick={() => setWriteOpen((current) => !current)}
                  type="button"
                >
                  {writeOpen ? "Close write panel" : "Write next node"}
                </button>
              ) : (
                <a className={styles.primaryButton} href="/login">
                  Login to write
                </a>
              )}
              <button className={styles.secondaryButton} onClick={handleCopyLink} type="button">
                Copy canvas link
              </button>
            </div>

            {writeOpen ? (
              <section className={styles.writePanel}>
                <span className={styles.sectionLabel}>Write next node</span>
                <label className={styles.fieldLabel}>Parent context</label>
                <div className={styles.contextBox}>{selectedNode.body}</div>

                <button
                  className={styles.summaryToggle}
                  onClick={() => setSummaryOpen((current) => !current)}
                  type="button"
                >
                  {summaryOpen ? "Hide previous summary" : "Show previous summary"}
                </button>

                {summaryOpen ? (
                  <div className={styles.summaryBox}>
                    Role 4 summary slot. This stays collapsed by default and expands only when the
                    writer asks for it.
                  </div>
                ) : null}

                <label className={styles.fieldLabel} htmlFor="story-draft">
                  Story content
                </label>
                <textarea
                  className={styles.textArea}
                  id="story-draft"
                  onChange={(event) => setDraftText(event.target.value)}
                  placeholder="Continue the story from the selected node..."
                  value={draftText}
                />

                <div className={styles.inlineTools}>
                  <button className={styles.secondaryButton} type="button">
                    Upload image
                  </button>
                  <button className={styles.secondaryButton} type="button">
                    AI image
                  </button>
                  <label className={styles.checkboxRow}>
                    <input type="checkbox" />
                    Mark this node as ending
                  </label>
                </div>

                <p className={styles.helperText}>
                  Drafts, media, and final publish will connect to Role 1 and Role 4 routes.
                </p>

                <div className={styles.buttonRow}>
                  <button className={styles.primaryButton} type="button">
                    Confirm and publish
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </aside>

        <section className={styles.miniMap}>
          <h2 className={styles.miniMapTitle}>Mini map</h2>
          <div className={styles.miniMapFrame}>
            {nodes.map((node) => (
              <div
                key={`mini-${node.id}`}
                className={styles.miniNode}
                style={{
                  left: 10 + node.position.x * MINIMAP_SCALE,
                  top: 8 + (node.position.y - 160) * MINIMAP_SCALE,
                }}
              />
            ))}
            <div className={styles.miniViewport} style={{ left: 18, top: 16, width: 82, height: 48 }} />
          </div>
          <p className={styles.miniCaption}>
            Bottom-left translucent overlay, kept inside the canvas instead of taking a permanent
            sidebar.
          </p>
        </section>
      </section>
    </main>
  );
}
