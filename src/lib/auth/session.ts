import { cookies } from "next/headers";
import {
  type SessionClaims,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt";

const ACCESS_COOKIE = "js_access_token";
const REFRESH_COOKIE = "js_refresh_token";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Issues a new session (access + refresh cookies) after OTP verification succeeds. */
export async function createSession(claims: SessionClaims): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(claims),
    signRefreshToken(claims),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 });
  cookieStore.set(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTS, maxAge: 30 * 24 * 60 * 60 });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

/**
 * Reads the current request's session, scoped to district + role (v5 §5.3).
 * Returns null if there is no valid session — callers decide how to respond.
 */
export async function getSession(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Access tokens last 15 minutes; without this, a user was simply logged
 * out every 15 minutes despite a 30-day refresh token existing and doing
 * nothing. Verifies the refresh cookie and reissues both tokens — the
 * refresh token is rotated too, not just reused, so a stolen refresh token
 * has a shrinking window of use once the legitimate client refreshes again.
 */
export async function refreshSession(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!token) return null;

  let claims: SessionClaims;
  try {
    claims = await verifyRefreshToken(token);
  } catch {
    return null;
  }

  await createSession(claims);
  return claims;
}
