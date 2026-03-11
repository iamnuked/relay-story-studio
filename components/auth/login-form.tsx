"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import styles from "@/components/auth/auth-form.module.css";
import type { LoginRequest } from "@/lib/types/api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload: LoginRequest = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    };

    setError(null);
    setIsSubmitting(true);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Login failed.");
        setIsSubmitting(false);
        return;
      }

      router.push("/home");
      router.refresh();
    });
  }

  return (
    <form className={`glass-panel ${styles.panel}`} onSubmit={handleSubmit}>
      <div className="stack">
        <h2 className={styles.title}>Log in</h2>
        <p className={`body-copy ${styles.helper}`}>
          Email/password auth is handled by Role 1 so the rest of the team can build against a
          stable session contract.
        </p>
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input autoComplete="email" id="email" name="email" type="email" required />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>

      {error ? <p className="status-text status-error">{error}</p> : null}

      <div className={styles.footer}>
        <Link className="button-ghost" href="/signup">
          Need an account?
        </Link>
        <button className="button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </div>
    </form>
  );
}
