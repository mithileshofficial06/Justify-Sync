"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveLawyerButtons({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch("/api/admin/approve-lawyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, decision }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={busy}
        onClick={() => decide("approve")}
        className="border-2 border-foreground bg-foreground px-3 py-1 font-mono text-xs tracking-widest text-background uppercase hover:bg-green-700 hover:border-green-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={busy}
        onClick={() => decide("reject")}
        className="border-2 border-accent px-3 py-1 font-mono text-xs tracking-widest text-accent uppercase hover:bg-accent hover:text-white disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
