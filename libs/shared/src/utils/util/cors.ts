import { ENV } from "@soundcircle/shared/utils/util/constant";

/**
 * The CORS allow-list, from `CORS_ALLOWED_ORIGINS` (comma-separated).
 *
 * Never `origin: "*"`. A service whose credentials travel in a header
 * cannot allow every origin. An empty list means no browser origin is allowed — which is the
 * correct failure for a misconfigured environment, not a reason to fall back to "*".
 */
export const corsOrigins = (): string[] => {
  return (ENV.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};
