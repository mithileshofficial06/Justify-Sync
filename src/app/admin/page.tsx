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
      <p className="mb-8 max-w-xl font-mono text-xs text-foreground/60 uppercase">
        Confirm each applicant is a genuine, currently-assigned DLSA/Legal Aid Defence Counsel before approving.
      </p>

      {pending.length === 0 ? (
        <p className="font-mono text-xs text-foreground/40 uppercase">No pending registrations.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((u) => (
            <li key={u.id} className="flex items-center justify-between border-2 border-foreground bg-panel p-4">
              <div>
                <p className="font-display text-sm uppercase">{u.fullName}</p>
                <p className="mt-1 font-mono text-xs text-foreground/60">
                  {u.barEnrolmentNo} · {u.email} · {u.mobileNumber}
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
