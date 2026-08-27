"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, H2 } from "@/components/ui";

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
    <div className="flex flex-col gap-6 border-2 border-foreground p-5">
      <div className="mb-1">
        <H2>Actions</H2>
      </div>

      <div>
        <Label>1. Extract facts from a charge sheet</Label>
        <textarea
          className="mt-1 h-32 w-full border-2 border-foreground bg-background p-2 font-mono text-xs outline-none focus:border-accent"
          placeholder="Paste charge sheet text here..."
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
        />
        <Button
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
          className="mt-2"
        >
          {busy === "Extract" ? "Extracting..." : "Extract"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t-2 border-foreground pt-5">
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("Compute", () => fetch(`/api/cases/${caseId}/compute`, { method: "POST" }))}
        >
          2. Compute eligibility
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("Draft", () => fetch(`/api/cases/${caseId}/draft`, { method: "POST" }))}
        >
          3. Draft application
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t-2 border-foreground pt-5">
        <Label>4. Update case status (lawyer sign-off)</Label>
        <div className="flex w-full flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Button
              key={status}
              variant="outline"
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
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {message && <p className="font-mono text-xs text-foreground/60">{message}</p>}
    </div>
  );
}
