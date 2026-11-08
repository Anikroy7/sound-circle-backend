import { signJwt, verifyJwt } from "@soundcircle/shared/utils/util/jwt.util";

const SECRET = "test-secret";

describe("jwt.util", () => {
  afterEach(() => jest.useRealTimers());

  it("round-trips a payload it signed", () => {
    const token = signJwt({ sub: 7, typ: "access" }, SECRET, 60);

    expect(verifyJwt(token, SECRET, "access")).toMatchObject({ sub: 7, typ: "access" });
  });

  it("rejects a token signed with another secret", () => {
    const token = signJwt({ sub: 7, typ: "access" }, "other-secret", 60);

    expect(verifyJwt(token, SECRET, "access")).toBeNull();
  });

  it("rejects a token whose payload was edited", () => {
    const [header, , signature] = signJwt({ sub: 7, typ: "access" }, SECRET, 60).split(".");
    const forged = Buffer.from(JSON.stringify({ sub: 1, typ: "access", exp: 9999999999 })).toString("base64url");

    expect(verifyJwt(`${header}.${forged}.${signature}`, SECRET, "access")).toBeNull();
  });

  it("rejects an unsigned alg:none token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ sub: 1, typ: "access", exp: 9999999999 })).toString("base64url");

    expect(verifyJwt(`${header}.${body}.`, SECRET, "access")).toBeNull();
  });

  it("rejects a refresh token presented as an access token", () => {
    const token = signJwt({ sub: 7, typ: "refresh" }, SECRET, 60);

    expect(verifyJwt(token, SECRET, "access")).toBeNull();
  });

  it("rejects an expired token", () => {
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    const token = signJwt({ sub: 7, typ: "access" }, SECRET, 60);

    jest.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    expect(verifyJwt(token, SECRET, "access")).toBeNull();
  });

  it("refuses to sign without a secret", () => {
    expect(() => signJwt({ sub: 7, typ: "access" }, undefined, 60)).toThrow();
  });

  it("returns null for garbage rather than throwing", () => {
    expect(verifyJwt("not-a-token", SECRET, "access")).toBeNull();
    expect(verifyJwt(undefined, SECRET, "access")).toBeNull();
  });
});
