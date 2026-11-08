import { createHmac, timingSafeEqual } from "crypto";

/** What a SoundCircle token carries. `typ` stops a refresh token from being accepted as an access token, and the reverse. */
export interface JwtPayload {
  sub: number;
  typ: "access" | "refresh";
  /** Refresh tokens only: whether the cookies outlive the browser session ("Keep me logged in"). */
  remember?: boolean;
  iat?: number;
  exp?: number;
}

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

const sign = (data: string, secret: string): string => createHmac("sha256", secret).update(data).digest("base64url");

/**
 * HS256, from Node's built-in crypto, so there is no dependency to keep patched.
 * ⚠ Throws without a secret: an empty HMAC key would make every token forgeable.
 */
export const signJwt = (payload: JwtPayload, secret: string, ttlSeconds: number): string => {
  if (!secret) throw new Error("JWT secret is not configured");

  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds })).toString("base64url");
  return `${HEADER}.${body}.${sign(`${HEADER}.${body}`, secret)}`;
};

/** The payload, or null for anything malformed, forged, expired or of another `typ`. Never throws. */
export const verifyJwt = (token: string, secret: string, typ: JwtPayload["typ"]): JwtPayload | null => {
  if (!token || !secret) return null;

  const [header, body, signature] = token.split(".");
  // Pinning the header to our own rejects `alg: none` and every algorithm swap.
  if (header !== HEADER || !body || !signature) return null;

  const expected = Buffer.from(sign(`${header}.${body}`, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload: JwtPayload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.typ !== typ || !Number.isInteger(payload.sub)) return null;
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};
