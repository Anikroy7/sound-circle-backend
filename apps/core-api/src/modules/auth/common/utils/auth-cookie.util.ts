import { CookieOptions, Response } from "express";
import { AppEnvironment } from "@soundcircle/shared/utils/util/enums";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  ENV,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@soundcircle/shared/utils/util/constant";
import { AuthTokens } from "@apps/core-api/modules/auth/common/types/auth.type";

/** The refresh cookie travels only to the auth routes, not with every API call. */
const REFRESH_COOKIE_PATH = "/api/v1/auth";

/**
 * httpOnly so no script can read a token, SameSite so another site cannot send them (schema-design §4.1).
 * `Secure` everywhere but LOCAL, where the API is plain http://localhost.
 */
const baseOptions = (path: string): CookieOptions => ({
  httpOnly: true,
  secure: ENV.APP_ENV !== AppEnvironment.LOCAL,
  sameSite: "lax",
  path,
});

export const setAuthCookies = (res: Response, tokens: AuthTokens): void => {
  // Without "Keep me logged in" both are session cookies: gone when the browser closes, whatever the JWT's own expiry.
  const maxAge = (seconds: number): CookieOptions => (tokens.remember ? { maxAge: seconds * 1000 } : {});

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.access_token, { ...baseOptions("/"), ...maxAge(ACCESS_TOKEN_TTL_SECONDS) });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refresh_token, { ...baseOptions(REFRESH_COOKIE_PATH), ...maxAge(REFRESH_TOKEN_TTL_SECONDS) });
};

/** ⚠ Logout can only clear the cookies: a stateless refresh token stays valid until it expires (schema-design §4.1). */
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseOptions("/"));
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseOptions(REFRESH_COOKIE_PATH));
};
