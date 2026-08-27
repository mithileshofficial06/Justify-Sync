"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, H2 } from "@/components/ui";

interface Section {
  id: string;
  code: string;
  law: string;
  maxSentenceDays: number;
}

export function ManualOverride({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [priorConvictions, setPriorConvictions] = useState<"" | "true" | "false">("");
  const [pendingCaseFlag, setPendingCaseFlag] = useState<"" | "NONE" | "CONFIRMED_MULTI" | "UNKNOWN">("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/knowledge-base/sections")
      .then((r) => r.json())
      .then((data) => setSections(data.sections ?? []))
      .catch(() => {});
  }, []);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {};
      if (selectedSections.length > 0) body.chargedSectionIds = selectedSections;
      if (priorConvictions !== "") body.priorConvictions = priorConvictions === "true";
      if (pendingCaseFlag !== "") body.pendingCaseFlag = pendingCaseFlag;

      const res = await fetch(`/api/cases/${caseId}/manual-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Override failed.");
      setMessage("Override applied — run Compute eligibility above to re-evaluate.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Override failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-2 border-accent p-5">
      <div className="mb-1">
        <H2>Manual override</H2>
      </div>
      <p className="mb-4 font-mono text-xs text-foreground/60">
        Use when extraction can&apos;t confidently resolve something — this is a fallback for the human
        lawyer, not a shortcut around it. Every value set here is a direct assertion you&apos;re making,
        recorded against your account.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <Label>Charged section(s) — click to toggle</Label>
          <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto border-2 border-foreground p-2">
            {sections.length === 0 && <span className="font-mono text-xs text-foreground/40">Loading…</span>}
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setSelectedSections((prev) =>
                    prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                  )
                }
                className={`border-2 px-2 py-1 font-mono text-xs ${
                  selectedSections.includes(s.id)
                    ? "border-accent bg-accent text-white"
                    : "border-foreground/30 text-foreground/70 hover:border-foreground"
                }`}
              >
                {s.law} {s.code}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <Label>Prior convictions</Label>
          <select
            className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm"
            value={priorConvictions}
            onChange={(e) => setPriorConvictions(e.target.value as typeof priorConvictions)}
          >
            <option value="">Leave as-is</option>
            <option value="false">Confirmed: no prior convictions</option>
            <option value="true">Confirmed: has prior conviction</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <Label>Other pending cases</Label>
          <select
            className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm"
            value={pendingCaseFlag}
            onChange={(e) => setPendingCaseFlag(e.target.value as typeof pendingCaseFlag)}
          >
            <option value="">Leave as-is</option>
            <option value="NONE">Confirmed: none</option>
            <option value="CONFIRMED_MULTI">Confirmed: has other pending case(s)</option>
            <option value="UNKNOWN">Unknown / needs review</option>
          </select>
        </label>

        <Button
          variant="outline"
          disabled={busy || (selectedSections.length === 0 && priorConvictions === "" && pendingCaseFlag === "")}
          onClick={submit}
        >
          {busy ? "Applying..." : "Apply override"}
        </Button>

        {message && <p className="font-mono text-xs text-foreground/60">{message}</p>}
      </div>
    </div>
  );
}
