import { hashPassword, verifyPassword } from "@soundcircle/shared/utils/util/password.util";

describe("verifyPassword", () => {
  it("accepts the password the hash was made from", async () => {
    expect(await verifyPassword("correct-horse", await hashPassword("correct-horse"))).toBe(true);
  });

  it("rejects any other password", async () => {
    expect(await verifyPassword("wrong-horse", await hashPassword("correct-horse"))).toBe(false);
  });

  it("rejects a missing or malformed hash instead of throwing", async () => {
    expect(await verifyPassword("correct-horse", null)).toBe(false);
    expect(await verifyPassword("correct-horse", "plain-text")).toBe(false);
    expect(await verifyPassword("correct-horse", "scrypt$00$00")).toBe(false);
  });
});
