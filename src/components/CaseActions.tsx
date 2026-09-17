"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label } from "@/components/ui";

const NEXT_STATUS: Record<string, { status: string; label: string }[]> = {
  IDENTIFIED: [{ status: "FILED", label: "Mark as filed" }],
  DELIVERED: [{ status: "FILED", label: "Mark as filed" }],
  FILED: [
    { status: "HEARD", label: "Record hearing" },
    { status: "BAIL_GRANTED", label: "Record bail granted" },
  ],
  HEARD: [{ status: "BAIL_GRANTED", label: "Record bail granted" }],
  BAIL_GRANTED: [{ status: "RELEASED", label: "Confirm released" }],
  RELEASED: [],
};

async function call(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Request failed.");
  return data;
}

/** Lawyer sign-off: records decisions made outside the system. Nothing here files with a court. */
export function StatusActions({
  caseId,
  caseStatus,
  canUpdate,
  eligible,
}: {
  caseId: string;
  caseStatus: string;
  canUpdate: boolean;
  eligible: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const next = NEXT_STATUS[caseStatus] ?? [];

  if (!eligible || next.length === 0) return null;

  if (!canUpdate) {
    return (
      <p className="font-mono text-[11px] text-foreground/60 uppercase">
        Only the district&apos;s DLSA lawyer can record filing and outcomes for this case.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {next.map((n) => (
          <Button
            key={n.status}
            disabled={busy !== null}
            onClick={async () => {
              setBusy(n.status);
              setMessage(null);
              try {
                await call(`/api/cases/${caseId}/status`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: n.status }),
                });
                router.refresh();
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Could not update status.");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === n.status ? "Saving..." : `${n.label} →`}
          </Button>
        ))}
      </div>
      <p className="font-mono text-[10px] text-foreground/55 uppercase">
        Records a step you have already taken — signed with your Bar Council identity in the audit log.
      </p>
      {message && <p className="font-mono text-xs text-accent">{message}</p>}
    </div>
  );
}

/** Live pipeline tools. The seeded demo cases never need these — their reading and drafts are pre-computed. */
export function PipelineTools({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [documentText, setDocumentText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: string, url: string, init?: RequestInit) {
    setBusy(action);
    setMessage(null);
    try {
      await call(url, init);
      setMessage(`${action}: done.`);
      router.refresh();
    } catch (err) {
      setMessage(`${action} failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <details className="border-2 border-foreground/40">
      <summary className="cursor-pointer px-4 py-3 font-mono text-xs tracking-widest uppercase hover:text-accent">
        Pipeline tools — re-read a document, recompute, redraft
      </summary>
      <div className="flex flex-col gap-5 border-t-2 border-foreground/20 p-4">
        <div>
          <Label>Extract facts from a charge sheet (live AI call)</Label>
          <textarea
            className="mt-1 h-32 w-full border-2 border-foreground bg-background p-2 font-mono text-xs outline-none focus:border-accent"
            placeholder="Paste charge sheet text here..."
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
          />
          <Button
            disabled={busy !== null || documentText.length < 20}
            onClick={() =>
              run("Extract", `/api/cases/${caseId}/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentText }),
              })
            }
            className="mt-2"
          >
            {busy === "Extract" ? "Extracting..." : "Extract"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 border-t-2 border-foreground/20 pt-4">
          <Button variant="outline" disabled={busy !== null} onClick={() => run("Compute", `/api/cases/${caseId}/compute`, { method: "POST" })}>
            {busy === "Compute" ? "Computing..." : "Recompute eligibility"}
          </Button>
          <Button variant="outline" disabled={busy !== null} onClick={() => run("Draft", `/api/cases/${caseId}/draft`, { method: "POST" })}>
            {busy === "Draft" ? "Drafting..." : "Draft application"}
          </Button>
        </div>
        {message && <p className="font-mono text-xs text-foreground/60">{message}</p>}
      </div>
    </details>
  );
}
