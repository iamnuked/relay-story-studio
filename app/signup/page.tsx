import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "@/app/auth-page.module.css";
import { SignupForm } from "@/components/auth/signup-form";
import { getSession } from "@/lib/auth/server";

export default async function SignupPage() {
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
              <p className="eyebrow">Foundation First</p>
              <h1 className="headline">Create a writer account and seed the relay.</h1>
              <p className={`body-copy ${styles.copy}`}>
                Signup is the first persistence path in this repository. It creates the user record,
                starts the session, and unlocks canvas creation plus all future authenticated flows.
              </p>
            </div>
          </div>

          <SignupForm />
        </section>
      </div>
    </main>
  );
}
