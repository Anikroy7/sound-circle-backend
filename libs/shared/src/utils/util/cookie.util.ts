import { Request } from "express";

/**
 * One cookie from the raw `Cookie` header, or null. Hand-parsed so `cookie-parser` is not a
 * dependency for the two cookies auth reads.
 */
export const readCookie = (req: Request, name: string): string | null => {
  for (const part of (req?.headers?.cookie ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue;

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
};
