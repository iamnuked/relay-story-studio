"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  function handleClick() {
    setIsPending(true);

    startTransition(async () => {
      await fetch("/api/auth/logout", {
        method: "POST"
      });

      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button className="button-secondary" disabled={isPending} onClick={handleClick} type="button">
      {isPending ? "Logging out..." : "Log out"}
    </button>
  );
}
