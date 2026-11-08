import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { MusicianProfileRepository } from "@soundcircle/shared/database/repositories/musician/musician-profile.repository";
import { ACCESS_TOKEN_TTL_SECONDS, ENV, REFRESH_TOKEN_TTL_SECONDS } from "@soundcircle/shared/utils/util/constant";
import { signJwt, verifyJwt } from "@soundcircle/shared/utils/util/jwt.util";
import { hashPassword, verifyPassword } from "@soundcircle/shared/utils/util/password.util";
import { AuthUser } from "@soundcircle/shared/utils/util/utils";
import { LoginDto } from "@apps/core-api/modules/auth/dto/login.dto";
import { AccountView, AuthTokens } from "@apps/core-api/modules/auth/common/types/auth.type";

/** One message for an unknown email and a wrong password, so the login form cannot be used to find out who has an account. */
const INVALID_CREDENTIALS = "Incorrect email or password";

@Injectable()
export class AuthService {
  /** Verified against when the email is unknown, so both failures take as long as each other. */
  private readonly dummyHash: Promise<string> = hashPassword("timing-equaliser");

  constructor(
    private readonly userRepository: UserRepository,
    private readonly musicianProfileRepository: MusicianProfileRepository,
  ) {}

  async login(reqDto: LoginDto): Promise<{ user: AccountView; tokens: AuthTokens }> {
    const credentials = await this.userRepository.getCredentialsByEmail(reqDto.email);
    const valid = await verifyPassword(reqDto.password, credentials?.password_hash ?? (await this.dummyHash));
    if (!credentials || !valid) throw new UnauthorizedException(INVALID_CREDENTIALS);

    const tokens = this.issueTokens(credentials.id, !!reqDto.remember);
    await this.userRepository.recordLogin(credentials.id);

    return { user: await this.account(credentials.id), tokens };
  }

  /** A fresh pair from a valid refresh token, keeping its "Keep me logged in" choice. 401 if the token or its account is gone. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyJwt(refreshToken, ENV.JWT_REFRESH_SECRET, "refresh");
    const user = payload && (await this.userRepository.getOne(payload.sub));
    if (!user) throw new UnauthorizedException("Your session has expired. Please log in again");

    return this.issueTokens(payload.sub, !!payload.remember);
  }

  /** The signed-in account. 401 if it was deleted while its access token was still valid. */
  async me(): Promise<AccountView> {
    const user = await this.account(AuthUser.get().getId());
    if (!user) throw new UnauthorizedException("Please log in to continue");
    return user;
  }

  /** The user with their profile photo (null before they add one), or undefined for a missing account. */
  private async account(userId: number): Promise<AccountView | undefined> {
    const [user, profile] = await Promise.all([this.userRepository.getOne(userId), this.musicianProfileRepository.getByUserId(userId)]);
    return user && Object.assign(user, { photo_url: profile?.photo_url ?? null });
  }

  private issueTokens(userId: number, remember: boolean): AuthTokens {
    return {
      access_token: signJwt({ sub: userId, typ: "access" }, ENV.JWT_ACCESS_SECRET, ACCESS_TOKEN_TTL_SECONDS),
      refresh_token: signJwt({ sub: userId, typ: "refresh", remember }, ENV.JWT_REFRESH_SECRET, REFRESH_TOKEN_TTL_SECONDS),
      remember,
    };
  }
}
