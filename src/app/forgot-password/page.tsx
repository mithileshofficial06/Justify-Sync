"use client";

import { useState } from "react";
import Link from "next/link";
import { H1, Label, Button } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [barEnrolmentNo, setBarEnrolmentNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barEnrolmentNo }),
      });
      const data = await res.json();
      setMessage(data.message ?? "Request submitted.");
    } catch {
      setMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm border-2 border-foreground bg-panel p-6">
        <Label>Account recovery</Label>
        <div className="mt-1 mb-6">
          <H1>Forgot password</H1>
        </div>

        {message ? (
          <p className="font-mono text-xs text-foreground/70">{message}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <Label>Bar Council enrolment no.</Label>
              <input
                className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                placeholder="TN/1234/2015"
                value={barEnrolmentNo}
                onChange={(e) => setBarEnrolmentNo(e.target.value)}
                required
              />
            </label>
            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <Link href="/login" className="mt-4 block text-center font-mono text-xs tracking-widest uppercase underline hover:text-accent">
          Back to login →
        </Link>
      </div>
    </main>
  );
}
