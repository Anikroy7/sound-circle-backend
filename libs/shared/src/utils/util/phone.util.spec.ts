import { E164_PATTERN, normalizePhone } from "@soundcircle/shared/utils/util/phone.util";

describe("normalizePhone", () => {
  it.each([
    ["01712-345678", "+8801712345678"],
    ["01712 345 678", "+8801712345678"],
    ["8801712345678", "+8801712345678"],
    ["+880 1712-345678", "+8801712345678"],
    ["008801712345678", "+8801712345678"],
    ["+44 (20) 7946 0958", "+442079460958"],
  ])("turns %s into %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
    expect(E164_PATTERN.test(expected)).toBe(true);
  });

  it("leaves a number it cannot place for the validator to refuse", () => {
    const result = normalizePhone("1712345678") as string;

    expect(E164_PATTERN.test(result)).toBe(false);
  });

  it("passes non-strings through untouched", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(42)).toBe(42);
  });
});
