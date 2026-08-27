import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { LogoutButton } from "./LogoutButton";

export async function Nav() {
  const session = await getSession();
  if (!session) return null;

  return (
    <nav className="flex items-center gap-6 border-b-2 border-foreground px-4 py-3">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center border-2 border-foreground bg-accent font-display text-sm text-white">
          J
        </span>
        <span className="font-display text-sm tracking-tight uppercase">Justify-Sync</span>
      </Link>

      <div className="hidden items-center gap-5 font-mono text-xs tracking-widest uppercase sm:flex">
        <Link href="/" className="hover:text-accent">
          Ranked list
        </Link>
        <Link href="/stalled" className="hover:text-accent">
          Stalled
        </Link>
        {(session.role === "LAWYER" || session.role === "DISTRICT_ADMIN") && (
          <Link href="/cases/new" className="hover:text-accent">
            New case
          </Link>
        )}
        {session.role === "DISTRICT_ADMIN" && (
          <Link href="/admin" className="hover:text-accent">
            Approvals
          </Link>
        )}
        {session.role === "STATE_ADMIN" && (
          <Link href="/admin/state" className="hover:text-accent">
            State overview
          </Link>
        )}
      </div>

      <span className="ml-auto flex items-center gap-4 font-mono text-xs tracking-widest uppercase">
        <span className="border-2 border-foreground px-2 py-0.5">{session.role}</span>
        <LogoutButton />
      </span>
    </nav>
  );
}
