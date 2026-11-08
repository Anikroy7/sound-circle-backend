import { toProfileSlug } from "@soundcircle/shared/utils/util/slug.util";

describe("toProfileSlug", () => {
  it("kebab-cases the name and appends the id", () => {
    expect(toProfileSlug("Tanvir Ahmed", 7)).toBe("tanvir-ahmed-7");
  });

  it("drops accents and punctuation", () => {
    expect(toProfileSlug("  Zoë O'Neil!! ", 12)).toBe("zoe-o-neil-12");
  });

  it("falls back to 'musician' for a name with no Latin letters", () => {
    expect(toProfileSlug("তানভীর", 3)).toBe("musician-3");
  });

  it("fits varchar(120) for the longest allowed name", () => {
    expect(toProfileSlug("a".repeat(100), 2147483647).length).toBeLessThanOrEqual(120);
  });
});
