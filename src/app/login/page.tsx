"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { H1, Label, Button } from "@/components/ui";

type Step = "credentials" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [barEnrolmentNo, setBarEnrolmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barEnrolmentNo, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed.");
      setUserId(data.userId);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "OTP verification failed.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm border-2 border-foreground bg-panel p-6">
        <Label>DLSA Lawyer Access</Label>
        <div className="mt-1 mb-6">
          <H1>Log in</H1>
        </div>

        {step === "credentials" ? (
          <form onSubmit={submitCredentials} className="flex flex-col gap-4">
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
            <label className="flex flex-col gap-1">
              <Label>Password</Label>
              <input
                type="password"
                className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="font-mono text-xs text-accent">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? "Checking..." : "Continue"}
            </Button>
            <Link
              href="/register"
              className="text-center font-mono text-xs tracking-widest uppercase underline hover:text-accent"
            >
              New DLSA lawyer? Register →
            </Link>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="flex flex-col gap-4">
            <p className="font-mono text-xs text-foreground/60 uppercase">
              Enter the 6-digit OTP sent to your registered mobile number. In dev without Twilio configured, check the server console.
            </p>
            <input
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-lg tracking-[0.5em] outline-none focus:border-accent"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            {error && <p className="font-mono text-xs text-accent">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? "Verifying..." : "Verify & log in"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
