"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { H1, Label, Button } from "@/components/ui";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") ?? "";
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Reset failed.");
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!userId || !token) {
    return <p className="font-mono text-xs text-accent">This reset link is missing required parameters.</p>;
  }

  if (done) {
    return <p className="font-mono text-xs text-foreground/70">Password reset. Redirecting to login…</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <Label>New password (min. 10 characters)</Label>
        <input
          type="password"
          minLength={10}
          className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="font-mono text-xs text-accent">{error}</p>}
      <Button type="submit" disabled={loading} className="mt-2 w-full">
        {loading ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm border-2 border-foreground bg-panel p-6">
        <Label>Account recovery</Label>
        <div className="mt-1 mb-6">
          <H1>Reset password</H1>
        </div>

        <Suspense fallback={<p className="font-mono text-xs text-foreground/40">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>

        <Link href="/login" className="mt-4 block text-center font-mono text-xs tracking-widest uppercase underline hover:text-accent">
          Back to login →
        </Link>
      </div>
    </main>
  );
}
