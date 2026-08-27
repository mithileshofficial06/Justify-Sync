import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/session";

/**
 * Called by a client-side keep-alive interval before the 15-minute access
 * token expires — see components/SessionKeepAlive.tsx. Without this, the
 * refresh token cookie existed but nothing ever used it.
 */
export async function POST() {
  const claims = await refreshSession();
  if (!claims) {
    return NextResponse.json({ error: "No valid session to refresh." }, { status: 401 });
  }
  return NextResponse.json({ refreshed: true });
}
