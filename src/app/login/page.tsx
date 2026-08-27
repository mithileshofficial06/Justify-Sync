"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold">Justify-Sync</h1>
      <p className="mb-6 text-sm text-neutral-500">DLSA lawyer login</p>

      {step === "credentials" ? (
        <form onSubmit={submitCredentials} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Bar Council enrolment no.
            <input
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              placeholder="TN/1234/2015"
              value={barEnrolmentNo}
              onChange={(e) => setBarEnrolmentNo(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {loading ? "Checking..." : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500">
            Enter the 6-digit OTP sent to your registered mobile number. (In dev without Twilio configured, check the server console for the code.)
          </p>
          <input
            className="rounded border border-neutral-300 px-3 py-2 tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {loading ? "Verifying..." : "Verify & log in"}
          </button>
        </form>
      )}
    </main>
  );
}
