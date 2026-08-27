import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { LogoutButton } from "./LogoutButton";

export async function Nav() {
  const session = await getSession();
  if (!session) return null;

  return (
    <nav className="flex items-center gap-4 border-b border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
      <span className="font-semibold">Justify-Sync</span>
      <Link href="/" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
        Ranked list
      </Link>
      <Link href="/stalled" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
        Stalled
      </Link>
      {(session.role === "LAWYER" || session.role === "DISTRICT_ADMIN") && (
        <Link href="/cases/new" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          New case
        </Link>
      )}
      {session.role === "DISTRICT_ADMIN" && (
        <Link href="/admin" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          Approvals
        </Link>
      )}
      {session.role === "STATE_ADMIN" && (
        <Link href="/admin/state" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          State overview
        </Link>
      )}
      <span className="ml-auto flex items-center gap-3">
        <span className="text-neutral-400">{session.role}</span>
        <LogoutButton />
      </span>
    </nav>
  );
}
