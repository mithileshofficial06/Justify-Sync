"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Label, H1, Button } from "@/components/ui";

interface District {
  id: string;
  name: string;
  state: string;
}

export default function RegisterPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [fullName, setFullName] = useState("");
  const [barEnrolmentNo, setBarEnrolmentNo] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/districts")
      .then((r) => r.json())
      .then((data) => {
        setDistricts(data.districts ?? []);
        if (data.districts?.[0]) setDistrictId(data.districts[0].id);
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, barEnrolmentNo, districtId, mobileNumber, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Registration failed.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm border-2 border-foreground bg-panel p-6 text-center">
          <Label>Submitted</Label>
          <div className="mt-1 mb-4">
            <H1>Awaiting approval</H1>
          </div>
          <p className="font-mono text-xs text-foreground/70">
            A District Admin must verify and approve your account before you can log in.
          </p>
          <Link href="/login" className="mt-6 inline-block font-mono text-xs tracking-widest uppercase underline hover:text-accent">
            Back to login →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm border-2 border-foreground bg-panel p-6">
        <Label>New DLSA lawyer</Label>
        <div className="mt-1 mb-6">
          <H1>Register</H1>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <Label>Full name</Label>
            <input
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>
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
            <Label>District</Label>
            <select
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              required
            >
              {districts.length === 0 && <option value="">No districts available — run npm run db:seed</option>}
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.state})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <Label>Mobile number</Label>
            <input
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <Label>Email</Label>
            <input
              type="email"
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <Label>Password (min. 10 characters)</Label>
            <input
              type="password"
              minLength={10}
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="font-mono text-xs text-accent">{error}</p>}
          <Button type="submit" disabled={loading || districts.length === 0} className="mt-2 w-full">
            {loading ? "Submitting..." : "Submit for approval"}
          </Button>
        </form>

        <Link href="/login" className="mt-4 block text-center font-mono text-xs tracking-widest uppercase underline hover:text-accent">
          Already registered? Log in →
        </Link>
      </div>
    </main>
  );
}
