"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { H1, Label, Button } from "@/components/ui";
import type { PublicDemoAccount } from "@/lib/demo";

type Step = "credentials" | "otp";

export function LoginForm({
  demoAccounts,
  prefill,
}: {
  demoAccounts: PublicDemoAccount[];
  prefill: PublicDemoAccount | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [barEnrolmentNo, setBarEnrolmentNo] = useState(prefill?.barEnrolmentNo ?? "");
  const [password, setPassword] = useState(prefill?.password ?? "");
  const [otp, setOtp] = useState("");
  const [otpAutoFilled, setOtpAutoFilled] = useState(false);
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
        body: JSON.stringify({ barEnrolmentNo: barEnrolmentNo.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Login failed.");
      setUserId(data.userId);
      if (typeof data.demoOtp === "string") {
        setOtp(data.demoOtp);
        setOtpAutoFilled(true);
      } else {
        setOtp("");
        setOtpAutoFilled(false);
      }
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
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "OTP verification failed.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account: PublicDemoAccount) {
    setBarEnrolmentNo(account.barEnrolmentNo);
    setPassword(account.password);
    setError(null);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="border-2 border-foreground bg-panel p-6">
          <Label>DLSA Lawyer Access</Label>
          <div className="mt-1 mb-6">
            <H1>Log in</H1>
          </div>

          <ol className="mb-5 flex gap-2 font-mono text-[10px] tracking-widest uppercase">
            <li className={`flex-1 border-2 px-2 py-1 ${step === "credentials" ? "border-accent bg-accent text-white" : "border-foreground/30 text-foreground/50"}`}>
              1 · Credentials
            </li>
            <li className={`flex-1 border-2 px-2 py-1 ${step === "otp" ? "border-accent bg-accent text-white" : "border-foreground/30 text-foreground/50"}`}>
              2 · One-time code
            </li>
          </ol>

          <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          {step === "credentials" ? (
            <form onSubmit={submitCredentials} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <Label>Username — Bar Council enrolment no.</Label>
                <input
                  className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                  placeholder="STATE/NUMBER/YEAR, e.g. TN/1234/2015"
                  value={barEnrolmentNo}
                  onChange={(e) => setBarEnrolmentNo(e.target.value)}
                  autoCapitalize="characters"
                  autoComplete="username"
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
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && <p className="font-mono text-xs text-accent">{error}</p>}
              <Button type="submit" disabled={loading} className="mt-2 w-full">
                {loading ? "Checking..." : "Continue"}
              </Button>
              <Link
                href="/forgot-password"
                className="text-center font-mono text-xs tracking-widest uppercase underline hover:text-accent"
              >
                Forgot password? →
              </Link>
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
                Enter the 6-digit code sent to your registered mobile number.
              </p>
              <input
                className="border-2 border-foreground bg-background px-3 py-2 font-mono text-lg tracking-[0.5em] outline-none focus:border-accent"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setOtpAutoFilled(false);
                }}
                required
              />
              {otpAutoFilled && (
                <p className="border-l-4 border-accent bg-background px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground/70">
                  <span className="font-bold text-accent">Demo account:</span> this code was auto-filled so you
                  can see the two-step flow without a registered phone. A real deployment delivers it by SMS to
                  the mobile number on the lawyer&apos;s Bar Council record — this step is never skipped.
                </p>
              )}
              {error && <p className="font-mono text-xs text-accent">{error}</p>}
              <Button type="submit" disabled={loading} className="mt-2 w-full">
                {loading ? "Verifying..." : "Verify & log in"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setError(null);
                }}
                className="font-mono text-xs tracking-widest uppercase underline hover:text-accent"
              >
                ← Back
              </button>
            </form>
          )}
          </motion.div>
          </AnimatePresence>
        </div>

        {step === "credentials" && demoAccounts.length > 0 && (
          <div className="border-2 border-dashed border-foreground/40 p-4">
            <Label>Evaluating JuriSync? Use a demo account</Label>
            <div className="mt-3 flex flex-col gap-2">
              {demoAccounts.map((a) => (
                <button
                  key={a.barEnrolmentNo}
                  type="button"
                  onClick={() => fillDemo(a)}
                  className="flex items-center justify-between gap-2 border-2 border-foreground px-3 py-2 text-left font-mono text-xs transition-colors hover:border-accent hover:bg-accent hover:text-white"
                >
                  <span className="font-bold uppercase">{a.roleLabel}</span>
                  <span>{a.barEnrolmentNo}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
