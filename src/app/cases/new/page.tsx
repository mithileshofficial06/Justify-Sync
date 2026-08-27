"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="mx-auto flex w-full max-w-sm flex-col px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold">New case</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Minimal record — charged sections and prior-conviction status get filled in from the charge sheet via extraction on the case page next.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Person name
          <input
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Arrest date
          <input
            type="date"
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            value={arrestDate}
            onChange={(e) => setArrestDate(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Custody status
          <select
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            value={custodyStatus}
            onChange={(e) => setCustodyStatus(e.target.value as "in_custody" | "released")}
          >
            <option value="in_custody">In custody</option>
            <option value="released">Released</option>
          </select>
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "Creating..." : "Create case"}
        </button>
      </form>
    </main>
  );
}
