import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/page.module.css";
import { getSession } from "@/lib/auth/server";

export default async function LandingPage() {
  const session = await getSession();

  if (session) {
    redirect("/home");
  }

  return (
    <main className="page-shell">
      <section className={`glass-panel ${styles.hero}`}>
        <div className="stack">
          <p className="eyebrow">Relay Novel Platform</p>
          <h1 className="headline">Stories split, writers continue, endings multiply.</h1>
          <p className={`body-copy ${styles.lede}`}>
            Role 1 owns the auth and backend foundation. This landing page stays intentionally
            small until the canvas, reader, and AI flows land from the other Codex roles.
          </p>
        </div>

        <div className="button-row">
          <Link className="button-primary" href="/signup">
            Create account
          </Link>
          <Link className="button-secondary" href="/login">
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
