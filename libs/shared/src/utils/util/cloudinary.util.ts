import { createHash } from "crypto";

export type CloudinaryParams = Record<string, string | number | boolean>;

/**
 * Cloudinary's request signature: every parameter except `file`, `cloud_name`, `resource_type` and
 * `api_key`, sorted by name, joined as `a=1&b=2`, with the API secret appended, then SHA-1 hex.
 * Empty values are left out, as Cloudinary leaves them out when it checks.
 *
 * ⚠ The secret only ever appears inside this hash; it is never returned or logged.
 */
export const signCloudinaryParams = (params: CloudinaryParams, apiSecret: string): string => {
  if (!apiSecret) throw new Error("Cloudinary API secret is not configured");

  const payload = Object.keys(params)
    .filter((key) => !["file", "cloud_name", "resource_type", "api_key"].includes(key))
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1")
    .update(payload + apiSecret)
    .digest("hex");
};
