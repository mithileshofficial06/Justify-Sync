import { SignJWT, jwtVerify } from "jose";

export interface SessionClaims {
  userId: string;
  role: "LAWYER" | "DISTRICT_ADMIN" | "STATE_ADMIN" | "REVIEWER";
  districtId: string | null;
  [key: string]: unknown;
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

function requireSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): Uint8Array {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — every session in this app is scoped by district and role (v5 §5.3), so this cannot be skipped.`);
  }
  return new TextEncoder().encode(value);
}

/**
 * v5 §5.3 — session bound to district + role, so every subsequent API call
 * is automatically scoped to only that lawyer's district and caseload.
 */
export async function signAccessToken(claims: SessionClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(requireSecret("JWT_ACCESS_SECRET"));
}

export async function signRefreshToken(claims: SessionClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(requireSecret("JWT_REFRESH_SECRET"));
}

export async function verifyAccessToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, requireSecret("JWT_ACCESS_SECRET"));
  return payload as unknown as SessionClaims;
}

export async function verifyRefreshToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, requireSecret("JWT_REFRESH_SECRET"));
  return payload as unknown as SessionClaims;
}
