import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPendingLawyers } from "@/lib/queries/pendingLawyers";
import { ApproveLawyerButtons } from "@/components/ApproveLawyerButtons";
import { Label, H1 } from "@/components/ui";

export default async function AdminApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DISTRICT_ADMIN") redirect("/");

  const pending = await getPendingLawyers(session);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Label>District admin</Label>
      <div className="mt-1 mb-2">
        <H1>Pending approvals</H1>
      </div>
      <p className="mb-3 max-w-xl font-mono text-xs text-foreground/60 uppercase">
        Confirm each applicant is a genuine, currently-assigned DLSA/Legal Aid Defence Counsel before approving.
      </p>
      <p className="mb-8 max-w-xl border-l-4 border-foreground/30 pl-3 font-mono text-[11px] leading-relaxed text-foreground/65">
        The Bar Council of India exposes no public verification API, so the District Admin checks the enrolment number
        against the State Bar Council roll and the DLSA panel. Until approved, an account cannot see any undertrial data.
      </p>

      {pending.length === 0 ? (
        <p className="font-mono text-xs text-foreground/40 uppercase">No pending registrations.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-foreground bg-panel p-4">
              <div className="min-w-0">
                <p className="font-display text-sm uppercase">{u.fullName}</p>
                <p className="mt-1 font-mono text-sm">
                  <span className="text-[10px] tracking-widest text-foreground/55 uppercase">Bar Council no. </span>
                  <span className="font-bold">{u.barEnrolmentNo}</span>
                </p>
                <p className="mt-0.5 font-mono text-xs break-all text-foreground/60">
                  {u.email} · {u.mobileNumber}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-foreground/40 uppercase">
                  Registered {u.createdAt.toDateString()}
                </p>
              </div>
              <ApproveLawyerButtons userId={u.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
