import styles from "@/components/home/dashboard.module.css";
import { CreateCanvasForm } from "@/components/home/create-canvas-form";
import { LogoutButton } from "@/components/home/logout-button";
import { getSession } from "@/lib/auth/server";
import { listParticipatedCanvases } from "@/lib/services/canvas";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const canvases = await listParticipatedCanvases(session.userId);

  return (
    <main className="page-shell">
      <div className={styles.stack}>
        <section className={`glass-panel ${styles.header}`}>
          <div className={styles.headerRow}>
            <div className="stack">
              <p className="eyebrow">Writer Home</p>
              <h1 className="headline" style={{ fontSize: "clamp(2.2rem, 5vw, 4.2rem)" }}>
                {session.nickname}, your relay workspace is live.
              </h1>
            </div>

            <LogoutButton />
          </div>

          <p className="body-copy" style={{ maxWidth: "64ch" }}>
            This page is owned by Role 1. It lists canvases tracked through participation records
            and exposes the creation flow that other roles will consume via the shared JSON routes.
          </p>
        </section>

        <section className={styles.grid}>
          <aside className={`glass-panel ${styles.section}`}>
            <div className="stack">
              <h2 style={{ margin: 0 }}>Create canvas</h2>
              <p className="body-copy">
                Canvas creation writes the canvas, root node, creator participation, and an
                automatic ending when the max branch length is `1`.
              </p>
            </div>

            <CreateCanvasForm />
          </aside>

          <section className={`glass-panel ${styles.section}`}>
            <div className="stack">
              <h2 style={{ margin: 0 }}>Participated canvases</h2>
              <p className="body-copy">
                Public canvas rendering and reader views are owned by other roles. For now, these
                cards expose stable share keys and API links for integration work.
              </p>
            </div>

            {canvases.length === 0 ? (
              <p className="status-text">No participation records yet. Create a canvas to seed one.</p>
            ) : (
              <div className="card-grid">
                {canvases.map((canvas) => (
                  <article className={`glass-panel ${styles.canvasCard}`} key={canvas.id}>
                    <div className="stack">
                      <h3 className={styles.canvasTitle}>{canvas.title}</h3>
                      <div className={styles.meta}>
                        <span>Share key: {canvas.shareKey}</span>
                        <span>Max nodes: {canvas.maxUserNodesPerBranch}</span>
                        <span>
                          Last contribution: {canvas.lastContributedAt ?? "No authored nodes yet"}
                        </span>
                      </div>
                    </div>

                    <div className="button-row">
                      <a className="button-secondary" href={`/api/canvases/${canvas.shareKey}`}>
                        Open JSON contract
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
