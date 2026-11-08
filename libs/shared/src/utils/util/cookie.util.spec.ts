import { Request } from "express";
import { readCookie } from "@soundcircle/shared/utils/util/cookie.util";

const withCookie = (cookie?: string): Request => ({ headers: { cookie } }) as Request;

describe("readCookie", () => {
  it("finds one cookie among several", () => {
    expect(readCookie(withCookie("theme=dark; sc_access=abc.def.ghi; other=1"), "sc_access")).toBe("abc.def.ghi");
  });

  it("does not match a cookie whose name only ends with the one asked for", () => {
    expect(readCookie(withCookie("not_sc_access=evil"), "sc_access")).toBeNull();
  });

  it("returns null when there is no cookie header", () => {
    expect(readCookie(withCookie(), "sc_access")).toBeNull();
  });
});
