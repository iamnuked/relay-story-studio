import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/auth-page.module.css";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/server";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/home");
  }

  return (
    <main className="page-shell">
      <div className={styles.shell}>
        <Link className="button-ghost" href="/">
          Back to landing
        </Link>

        <section className={styles.grid}>
          <div className={`glass-panel ${styles.panel}`}>
            <div className="stack">
              <p className="eyebrow">Session Contract</p>
              <h1 className="headline">Role 1 keeps the auth surface stable.</h1>
              <p className={`body-copy ${styles.copy}`}>
                The rest of the team can assume email/password login, a signed session cookie, and
                authenticated write routes. Anonymous readers still reach shared canvases through
                their `shareKey`.
              </p>
            </div>
          </div>

          <LoginForm />
        </section>
      </div>
    </main>
  );
}
