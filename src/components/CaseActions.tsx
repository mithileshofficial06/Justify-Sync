"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["FILED", "HEARD", "BAIL_GRANTED", "RELEASED"] as const;

export function CaseActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [documentText, setDocumentText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<Response>) {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fn();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Request failed.");
      setMessage(`${action}: done.`);
      router.refresh();
    } catch (err) {
      setMessage(`${action} failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <div>
        <label className="mb-1 block font-medium">1. Extract facts from a charge sheet</label>
        <textarea
          className="h-32 w-full rounded border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Paste charge sheet text here..."
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
        />
        <button
          disabled={busy !== null || documentText.length < 20}
          onClick={() =>
            run("Extract", () =>
              fetch(`/api/cases/${caseId}/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentText }),
              })
            )
          }
          className="mt-2 rounded bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {busy === "Extract" ? "Extracting..." : "Extract"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          disabled={busy !== null}
          onClick={() => run("Compute", () => fetch(`/api/cases/${caseId}/compute`, { method: "POST" }))}
          className="rounded border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
        >
          2. Compute eligibility
        </button>
        <button
          disabled={busy !== null}
          onClick={() => run("Draft", () => fetch(`/api/cases/${caseId}/draft`, { method: "POST" }))}
          className="rounded border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
        >
          3. Draft application
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <span className="w-full font-medium">4. Update case status (lawyer sign-off)</span>
        {STATUSES.map((status) => (
          <button
            key={status}
            disabled={busy !== null}
            onClick={() =>
              run(`Status:${status}`, () =>
                fetch(`/api/cases/${caseId}/status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status }),
                })
              )
            }
            className="rounded border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-neutral-700"
          >
            {status}
          </button>
        ))}
      </div>

      {message && <p className="text-xs text-neutral-500">{message}</p>}
    </div>
  );
}
