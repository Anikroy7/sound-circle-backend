import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { CustomRequest, getRequestIpAddress } from "@soundcircle/shared/utils/util/utils";

/**
 * Builds the per-request context `AuthUser` / `RequestIp` read, so `AbstractEntity`'s hooks
 * can stamp `created_ip` etc. Applied to every route. It never refuses a request.
 *
 * ⚠ `user` stays null until the JWT auth of schema-design §4.1 lands; that change resolves
 * the token here and sets it.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    CustomRequest.run(
      {
        user_agent: req.headers["user-agent"],
        ip_address: getRequestIpAddress(req),
        user: null,
      },
      () => next(),
    );
  }
}
