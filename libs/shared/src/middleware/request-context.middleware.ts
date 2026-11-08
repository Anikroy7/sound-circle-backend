import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { CustomRequest, getRequestIpAddress } from "@soundcircle/shared/utils/util/utils";
import { ACCESS_TOKEN_COOKIE, ENV } from "@soundcircle/shared/utils/util/constant";
import { readCookie } from "@soundcircle/shared/utils/util/cookie.util";
import { verifyJwt } from "@soundcircle/shared/utils/util/jwt.util";

/**
 * Builds the per-request context `AuthUser` / `RequestIp` read, so `AbstractEntity`'s hooks
 * can stamp `created_ip` etc. Applied to every route. It never refuses a request.
 *
 * `user` is resolved from the access-token cookie (schema-design §4.1) and is null for a
 * visitor or an invalid/expired token. Refusing is `AuthGuard`'s job, not this one's.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const token = verifyJwt(readCookie(req, ACCESS_TOKEN_COOKIE), ENV.JWT_ACCESS_SECRET, "access");

    CustomRequest.run(
      {
        user_agent: req.headers["user-agent"],
        ip_address: getRequestIpAddress(req),
        // Only the id: an entity instance so `AbstractEntity` can call `getId()` on it, without a database read per request.
        user: token ? Object.assign(new UserEntity(), { id: token.sub }) : null,
      },
      () => next(),
    );
  }
}
