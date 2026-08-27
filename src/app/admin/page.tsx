import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPendingLawyers } from "@/lib/queries/pendingLawyers";
import { ApproveLawyerButtons } from "@/components/ApproveLawyerButtons";

export default async function AdminApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DISTRICT_ADMIN") redirect("/");

  const pending = await getPendingLawyers(session);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold">Lawyer registrations awaiting approval</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Confirm each applicant is a genuine, currently-assigned DLSA/Legal Aid Defence Counsel for this district before approving (v5 §5.2).
      </p>

      {pending.length === 0 ? (
        <p className="text-sm text-neutral-400">No pending registrations.</p>
      ) : (
        <ul className="flex flex-col gap-3 text-sm">
          {pending.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium">{u.fullName}</p>
                <p className="text-neutral-500">
                  {u.barEnrolmentNo} · {u.email} · {u.mobileNumber}
                </p>
                <p className="text-xs text-neutral-400">Registered {u.createdAt.toDateString()}</p>
              </div>
              <ApproveLawyerButtons userId={u.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
