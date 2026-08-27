"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label, H1, Button } from "@/components/ui";

export default function NewCasePage() {
  const router = useRouter();
  const [personName, setPersonName] = useState("");
  const [arrestDate, setArrestDate] = useState("");
  const [custodyStatus, setCustodyStatus] = useState<"in_custody" | "released">("in_custody");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personName, arrestDate, custodyStatus, pendingCaseFlag: "UNKNOWN" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Failed to create case.");
      router.push(`/cases/${data.case.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create case.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 py-10">
      <Label>Stage 2</Label>
      <div className="mt-1 mb-2">
        <H1>New case</H1>
      </div>
      <p className="mb-8 font-mono text-xs text-foreground/60 uppercase">
        Charged sections and prior-conviction status get filled in from the charge sheet via extraction on the case page next.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Label>Person name</Label>
          <input
            className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <Label>Arrest date</Label>
          <input
            type="date"
            className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            value={arrestDate}
            onChange={(e) => setArrestDate(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <Label>Custody status</Label>
          <select
            className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            value={custodyStatus}
            onChange={(e) => setCustodyStatus(e.target.value as "in_custody" | "released")}
          >
            <option value="in_custody">In custody</option>
            <option value="released">Released</option>
          </select>
        </label>
        {error && <p className="font-mono text-xs text-accent">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creating..." : "Create case"}
        </Button>
      </form>
    </main>
  );
}
