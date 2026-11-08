import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthBaseController } from "@soundcircle/shared/utils/controllers/auth-base-controller";
import { AccountView } from "@apps/core-api/modules/auth/common/types/auth.type";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { AuthService } from "@apps/core-api/modules/auth/auth.service";

@ApiTags("IDN")
@Controller("auth")
export class AuthController extends AuthBaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Get("me")
  @ApiOperation({ summary: "The signed-in account; 401 for a visitor or an expired access cookie" })
  async me(): Promise<AccountView> {
    const user: AccountView = await this.authService.me();
    return ApiResponse(user, "Fetch Successfully");
  }
}
