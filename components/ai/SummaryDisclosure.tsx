"use client";

import { useEffect, useState } from "react";
import type { SummaryResponse } from "@/lib/ai/types";
import styles from "./SummaryDisclosure.module.css";

type SummaryDisclosureProps = {
  canvasId: string;
  baseNodeId: string;
  triggerLabel?: string;
  className?: string;
};

type SummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; payload: SummaryResponse & { status: "ready" } }
  | { status: "not_needed"; payload: SummaryResponse & { status: "not_needed" } }
  | { status: "error"; message: string };

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "Could not load summary.";
  } catch {
    return "Could not load summary.";
  }
}

export function SummaryDisclosure({
  canvasId,
  baseNodeId,
  triggerLabel = "Show previous summary",
  className
}: SummaryDisclosureProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SummaryState>({ status: "idle" });

  useEffect(() => {
    setOpen(false);
    setState({ status: "idle" });
  }, [canvasId, baseNodeId]);

  useEffect(() => {
    if (!open || state.status !== "idle") {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    async function loadSummary() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/ai/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ canvasId, baseNodeId }),
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const payload = (await response.json()) as SummaryResponse;

        if (cancelled) {
          return;
        }

        if (payload.status === "ready") {
          setState({ status: "ready", payload });
          return;
        }

        setState({ status: "not_needed", payload });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof DOMException && error.name === "AbortError"
                ? "Summary request timed out. Try again."
                : error instanceof Error
                  ? error.message
                  : "Could not load summary."
          });
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, state.status, canvasId, baseNodeId]);

  function handleToggle() {
    setOpen((current) => {
      const nextOpen = !current;

      if (!nextOpen) {
        setState({ status: "idle" });
      } else if (state.status === "error") {
        setState({ status: "idle" });
      }

      return nextOpen;
    });
  }

  function handleRetry() {
    setState({ status: "idle" });
    setOpen(true);
  }

  return (
    <div className={[styles.root, className ?? ""].join(" ").trim()}>
      <button className={styles.trigger} onClick={handleToggle} type="button">
        {open ? "Hide previous summary" : triggerLabel}
      </button>

      {open ? (
        <div className={styles.panel}>
          {state.status === "loading" ? <p className={styles.message}>Loading branch summary...</p> : null}
          {state.status === "error" ? (
            <div className={styles.errorBlock}>
              <p className={styles.error}>{state.message}</p>
              <button className={styles.retryButton} onClick={handleRetry} type="button">
                Retry summary
              </button>
            </div>
          ) : null}
          {state.status === "not_needed" ? (
            <p className={styles.message}>
              This branch is still short enough that the earlier context fits without a generated summary.
            </p>
          ) : null}
          {state.status === "ready" ? (
            <>
              <p className={styles.summaryText}>{state.payload.summary.summaryText}</p>
              <p className={styles.metaText}>
                Source nodes: {state.payload.meta.sourceNodeCount} · Context length: {state.payload.meta.sourceCharCount} characters · Source: {state.payload.source}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
