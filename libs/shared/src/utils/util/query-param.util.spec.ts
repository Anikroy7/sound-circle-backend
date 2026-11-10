import { escapeLike, toBoolean, toIdList, toOptionalInt } from "@soundcircle/shared/utils/util/query-param.util";

describe("toIdList", () => {
  it("reads a comma list and a repeated key the same way", () => {
    expect(toIdList({ value: "1,2, 3" })).toEqual([1, 2, 3]);
    expect(toIdList({ value: ["1", "2"] })).toEqual([1, 2]);
  });

  it("treats an absent or empty value as no filter", () => {
    expect(toIdList({ value: undefined })).toBeUndefined();
    expect(toIdList({ value: "" })).toBeUndefined();
  });

  it("never drops a bad id silently, so validation can refuse it", () => {
    const ids = toIdList({ value: "4,abc,-1" });
    expect(ids[0]).toBe(4);
    expect(Number.isNaN(ids[1])).toBe(true);
    expect(Number.isNaN(ids[2])).toBe(true);
  });
});

describe("toOptionalInt", () => {
  it("parses an integer and leaves junk for the validator", () => {
    expect(toOptionalInt({ value: "3026" })).toBe(3026);
    expect(toOptionalInt({ value: "" })).toBeUndefined();
    expect(toOptionalInt({ value: "12abc" })).toBe("12abc");
  });
});

describe("toBoolean", () => {
  it("parses query booleans and leaves junk for the validator", () => {
    expect(toBoolean({ value: "true" })).toBe(true);
    expect(toBoolean({ value: "0" })).toBe(false);
    expect(toBoolean({ value: "maybe" })).toBe("maybe");
  });
});

describe("escapeLike", () => {
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off")).toBe("50\\%\\_off");
  });
});
