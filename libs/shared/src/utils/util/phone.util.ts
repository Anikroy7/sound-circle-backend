/** E.164, as `users.phone` stores it (schema-design §4.1). */
export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Brings a phone number to E.164 so it is stored, compared and kept unique in one form. Spaces,
 * dashes, dots and brackets go; a Bangladeshi number written locally (`01712-345678`) or without
 * the plus (`8801712345678`) gains `+880`. Anything else comes back stripped, for the validator to judge.
 */
export const normalizePhone = (value: unknown): unknown => {
  if (typeof value !== "string") return value;

  const compact = value.trim().replace(/[\s\-().]/g, "");
  if (/^01\d{9}$/.test(compact)) return `+88${compact}`;
  if (/^8801\d{9}$/.test(compact)) return `+${compact}`;
  if (/^00[1-9]/.test(compact)) return `+${compact.slice(2)}`;
  return compact;
};
