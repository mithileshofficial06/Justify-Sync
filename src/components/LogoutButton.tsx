"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="border-2 border-foreground px-2 py-0.5 hover:bg-foreground hover:text-background"
    >
      Log out
    </button>
  );
}
