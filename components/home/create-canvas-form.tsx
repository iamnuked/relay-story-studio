"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { CreateCanvasRequest, CreateCanvasResponse } from "@/lib/types/api";

export function CreateCanvasForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: CreateCanvasRequest = {
      title: String(formData.get("title") ?? ""),
      rootContent: String(formData.get("rootContent") ?? ""),
      maxUserNodesPerBranch: Number(formData.get("maxUserNodesPerBranch") ?? 12),
      rootPosition: {
        x: 0,
        y: 0
      }
    };

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    startTransition(async () => {
      const response = await fetch("/api/canvases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as CreateCanvasResponse & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Canvas creation failed.");
        setIsSubmitting(false);
        return;
      }

      const autoEndingNote = data.autoEndingNode ? " Auto ending created immediately." : "";
      setSuccess(`Canvas created with share key ${data.canvas.shareKey}.${autoEndingNote}`);
      form.reset();
      setIsSubmitting(false);
      router.push(`/canvas/${data.canvas.shareKey}`);
      router.refresh();
    });
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" maxLength={80} minLength={3} name="title" type="text" required />
      </div>

      <div className="field">
        <label htmlFor="rootContent">Opening node</label>
        <textarea id="rootContent" name="rootContent" required />
      </div>

      <div className="field">
        <label htmlFor="maxUserNodesPerBranch">Max user nodes per branch</label>
        <input
          defaultValue={12}
          id="maxUserNodesPerBranch"
          max={50}
          min={1}
          name="maxUserNodesPerBranch"
          type="number"
          required
        />
      </div>

      {error ? <p className="status-text status-error">{error}</p> : null}
      {success ? <p className="status-text status-success">{success}</p> : null}

      <button className="button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating..." : "Create canvas"}
      </button>
    </form>
  );
}
