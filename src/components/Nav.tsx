import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { LogoutButton } from "./LogoutButton";

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center border-2 border-foreground bg-accent font-display text-sm text-white">
        J
      </span>
      <span className="font-display text-sm tracking-tight uppercase">JuriSync</span>
    </Link>
  );
}

const ROLE_LABEL = {
  LAWYER: "DLSA Lawyer",
  DISTRICT_ADMIN: "District Admin",
  STATE_ADMIN: "State Admin",
  REVIEWER: "Reviewer",
} as const;

function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <div className="-mx-4 flex gap-5 overflow-x-auto border-t-2 border-foreground/15 px-4 py-2 font-mono text-xs tracking-widest whitespace-nowrap uppercase sm:mx-0 sm:border-0 sm:p-0">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-accent">
          {l.label}
        </Link>
      ))}
    </div>
  );
}

export async function Nav() {
  const session = await getSession();

  const publicLinks = [
    { href: "/knowledge-base", label: "Knowledge base" },
    { href: "/data-sources", label: "Data sources" },
  ];

  if (!session) {
    return (
      <nav className="flex flex-wrap items-center gap-x-6 border-b-2 border-foreground px-4 pt-3 sm:py-3">
        <Logo />
        <span className="ml-auto flex items-center gap-4 font-mono text-xs tracking-widest uppercase">
          <Link href="/login" className="hover:text-accent">
            Log in
          </Link>
          <Link
            href="/register"
            className="border-2 border-foreground bg-foreground px-3 py-1 text-background hover:border-accent hover:bg-accent"
          >
            Register →
          </Link>
        </span>
        <div className="mt-3 w-full sm:order-none sm:mt-0 sm:w-auto">
          <NavLinks links={publicLinks} />
        </div>
      </nav>
    );
  }

  const links = [
    { href: "/", label: "Ranked list" },
    { href: "/needs-review", label: "Needs review" },
    { href: "/stalled", label: "Stalled" },
    ...(session.role === "LAWYER" || session.role === "DISTRICT_ADMIN" ? [{ href: "/cases/new", label: "New case" }] : []),
    ...(session.role === "DISTRICT_ADMIN" ? [{ href: "/admin", label: "Approvals" }] : []),
    ...(session.role === "STATE_ADMIN" ? [{ href: "/admin/state", label: "State overview" }] : []),
    ...publicLinks,
  ];

  return (
    <nav className="flex flex-wrap items-center gap-x-6 border-b-2 border-foreground px-4 pt-3 sm:py-3">
      <Logo />
      <span className="ml-auto flex items-center gap-3 font-mono text-xs tracking-widest uppercase sm:order-last">
        <span className="border-2 border-foreground px-2 py-0.5">{ROLE_LABEL[session.role]}</span>
        <LogoutButton />
      </span>
      <div className="mt-3 w-full sm:mt-0 sm:w-auto">
        <NavLinks links={links} />
      </div>
    </nav>
  );
}
