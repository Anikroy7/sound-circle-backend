import { CanActivate, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthUser } from "@soundcircle/shared/utils/util/utils";

/**
 * Refuses a request with no signed-in user. `RequestContextMiddleware` has already resolved the
 * access-token cookie, so this only reads the result. Applied through `AuthBaseController`, never per route.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(): boolean {
    if (!AuthUser.get()) throw new UnauthorizedException("Please log in to continue");
    return true;
  }
}
