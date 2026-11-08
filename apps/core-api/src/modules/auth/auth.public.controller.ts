import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { AccountView } from "@apps/core-api/modules/auth/common/types/auth.type";
import { REFRESH_TOKEN_COOKIE } from "@soundcircle/shared/utils/util/constant";
import { readCookie } from "@soundcircle/shared/utils/util/cookie.util";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { AuthService } from "@apps/core-api/modules/auth/auth.service";
import { LoginDto } from "@apps/core-api/modules/auth/dto/login.dto";
import { clearAuthCookies, setAuthCookies } from "@apps/core-api/modules/auth/common/utils/auth-cookie.util";

/** Tokens travel only in httpOnly cookies (schema-design §4.1); no response body ever carries one. */
@ApiTags("IDN")
@Controller("auth")
export class AuthPublicController extends PublicBaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email and password; sets the access and refresh cookies" })
  async login(@Body() reqDto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AccountView> {
    const { user, tokens } = await this.authService.login(reqDto);
    setAuthCookies(res, tokens);
    return ApiResponse(user, "Logged In Successfully");
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Swap a valid refresh cookie for a fresh pair of cookies" })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<null> {
    setAuthCookies(res, await this.authService.refresh(readCookie(req, REFRESH_TOKEN_COOKIE)));
    return ApiResponse(null, "Refreshed Successfully");
  }

  /** Public, so a user whose access token has already expired can still sign out. */
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Clear the auth cookies" })
  async logout(@Res({ passthrough: true }) res: Response): Promise<null> {
    clearAuthCookies(res);
    return ApiResponse(null, "Logged Out Successfully");
  }
}
