import { UnauthorizedException } from "@nestjs/common";
import { ENV } from "@soundcircle/shared/utils/util/constant";
import { signJwt, verifyJwt } from "@soundcircle/shared/utils/util/jwt.util";
import { hashPassword } from "@soundcircle/shared/utils/util/password.util";
import { CustomRequest } from "@soundcircle/shared/utils/util/utils";
import { AuthService } from "@apps/core-api/modules/auth/auth.service";
import { LoginDto } from "@apps/core-api/modules/auth/dto/login.dto";

const USER = { id: 7, name: "Rahim", email: "rahim@example.com" };
/** The account as the API returns it: the user plus the profile photo (none here). */
const ACCOUNT = { ...USER, photo_url: null };

/** No musician profile yet, so no photo. */
const PROFILES: any = { getByUserId: jest.fn(async () => undefined) };

const makeRepository = async (): Promise<any> => ({
  getCredentialsByEmail: jest.fn(async (email: string) =>
    email === USER.email ? { id: USER.id, password_hash: await hashPassword("correct-horse") } : undefined,
  ),
  getOne: jest.fn(async (id: number) => (id === USER.id ? { ...USER } : undefined)),
  recordLogin: jest.fn(async () => undefined),
});

describe("AuthService", () => {
  const original = { access: ENV.JWT_ACCESS_SECRET, refresh: ENV.JWT_REFRESH_SECRET };

  beforeAll(() => {
    ENV.JWT_ACCESS_SECRET = "access-secret";
    ENV.JWT_REFRESH_SECRET = "refresh-secret";
  });

  afterAll(() => {
    ENV.JWT_ACCESS_SECRET = original.access;
    ENV.JWT_REFRESH_SECRET = original.refresh;
  });

  describe("login", () => {
    it("returns the user and a token pair for the right password", async () => {
      const repository = await makeRepository();
      const { user, tokens } = await new AuthService(repository, PROFILES).login({ email: USER.email, password: "correct-horse" } as LoginDto);

      expect(user).toEqual(ACCOUNT);
      expect(verifyJwt(tokens.access_token, "access-secret", "access")).toMatchObject({ sub: 7 });
      expect(verifyJwt(tokens.refresh_token, "refresh-secret", "refresh")).toMatchObject({ sub: 7, remember: false });
      expect(repository.recordLogin).toHaveBeenCalledWith(7);
    });

    it("never returns the password hash", async () => {
      const { user } = await new AuthService(await makeRepository(), PROFILES).login({ email: USER.email, password: "correct-horse" } as LoginDto);

      expect(JSON.stringify(user)).not.toContain("scrypt$");
    });

    it("carries Keep me logged in into the refresh token", async () => {
      const { tokens } = await new AuthService(await makeRepository(), PROFILES).login({
        email: USER.email,
        password: "correct-horse",
        remember: true,
      } as LoginDto);

      expect(tokens.remember).toBe(true);
      expect(verifyJwt(tokens.refresh_token, "refresh-secret", "refresh").remember).toBe(true);
    });

    it("gives a wrong password and an unknown email the same 401", async () => {
      const service = new AuthService(await makeRepository(), PROFILES);
      const wrongPassword = await service.login({ email: USER.email, password: "wrong-horse" } as LoginDto).catch((error) => error);
      const unknownEmail = await service.login({ email: "nobody@example.com", password: "correct-horse" } as LoginDto).catch((error) => error);

      expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
      expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
      expect(wrongPassword.message).toBe(unknownEmail.message);
    });

    it("does not record a failed login", async () => {
      const repository = await makeRepository();
      await new AuthService(repository, PROFILES).login({ email: USER.email, password: "wrong-horse" } as LoginDto).catch(() => undefined);

      expect(repository.recordLogin).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("issues a new pair from a valid refresh token, keeping remember", async () => {
      const token = signJwt({ sub: 7, typ: "refresh", remember: true }, "refresh-secret", 60);
      const tokens = await new AuthService(await makeRepository(), PROFILES).refresh(token);

      expect(tokens.remember).toBe(true);
      expect(verifyJwt(tokens.access_token, "access-secret", "access")).toMatchObject({ sub: 7 });
    });

    it("refuses an access token presented as a refresh token", async () => {
      const token = signJwt({ sub: 7, typ: "access" }, "access-secret", 60);

      await expect(new AuthService(await makeRepository(), PROFILES).refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("refuses a missing token", async () => {
      await expect(new AuthService(await makeRepository(), PROFILES).refresh(null)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("refuses a valid token whose account no longer exists", async () => {
      const token = signJwt({ sub: 99, typ: "refresh" }, "refresh-secret", 60);

      await expect(new AuthService(await makeRepository(), PROFILES).refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("me", () => {
    const asUser = <T>(id: number, fn: () => T): T =>
      CustomRequest.run({ user_agent: "jest", ip_address: "127.0.0.1", user: { getId: () => id } as any }, fn);

    it("returns the signed-in account", async () => {
      const service = new AuthService(await makeRepository(), PROFILES);

      await expect(asUser(7, () => service.me())).resolves.toEqual(ACCOUNT);
    });

    it("includes the profile photo, for the header avatar", async () => {
      const profiles = { getByUserId: jest.fn(async () => ({ photo_url: "https://res.cloudinary.com/x/avatar.webp" })) } as any;
      const service = new AuthService(await makeRepository(), profiles);

      await expect(asUser(7, () => service.me())).resolves.toEqual({ ...USER, photo_url: "https://res.cloudinary.com/x/avatar.webp" });
    });

    it("401s when the account was deleted after the token was issued", async () => {
      const service = new AuthService(await makeRepository(), PROFILES);

      await expect(asUser(99, () => service.me())).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
