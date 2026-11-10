/**
 * Query-string transforms for filter DTOs. A query value arrives as a string, a repeated key as an array,
 * so both `?ids=1,2` and `?ids=1&ids=2` read as `[1, 2]`. Anything that is not a positive integer is
 * kept as NaN, so the DTO's `@IsInt({ each: true })` refuses it rather than the filter silently widening.
 */
export const toIdList = ({ value }: { value: unknown }): number[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const parts = (Array.isArray(value) ? value : String(value).split(",")).map((part) => String(part).trim()).filter(Boolean);
  return parts.map((part) => (/^\d+$/.test(part) ? Number(part) : NaN));
};

/** One integer from the query; absent or empty is no filter. */
export const toOptionalInt = ({ value }: { value: unknown }): unknown =>
  value === undefined || value === null || value === "" ? undefined : /^-?\d+$/.test(String(value)) ? Number(value) : value;

/** `"true"` / `"1"` → true, `"false"` / `"0"` → false; anything else is left for `@IsBoolean()` to refuse. */
export const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === "true" || value === "1" || value === true) return true;
  if (value === "false" || value === "0" || value === false) return false;
  return value;
};

/** `%` and `_` in what the user typed are literal characters, not wildcards (use with `ESCAPE '\'`). */
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (character) => `\\${character}`);
