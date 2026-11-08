/** Unicode combining marks: what NFKD splits off an accented letter ("ë" → "e" + "¨"). */
const COMBINING_MARKS = /\p{M}/gu;

/**
 * `"Tanvir Ahmed", 7` → `"tanvir-ahmed-7"`. The id suffix makes the slug unique by construction, so no
 * "-2, -3" retry loop is needed. A name with no Latin letters or digits (e.g. Bangla only) becomes
 * `"musician-7"` (or `fallback`-7: bands pass `"band"`).
 */
export const toProfileSlug = (name: string, id: number, fallback = "musician"): string => {
  const base = (name ?? "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");

  return `${base || fallback}-${id}`;
};
