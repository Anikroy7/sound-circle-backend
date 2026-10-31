import { Controller, Get, HttpStatus, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { PublicBaseController } from "@soundcircle/shared/utils/controllers/public-base-controller";
import { ApiResponse } from "@soundcircle/shared/utils/util/utils";
import { AppService } from "@apps/core-api/modules/app/app.service";

@ApiTags("APP")
@Controller()
export class AppController extends PublicBaseController {
  constructor(private readonly appService: AppService) {
    super();
  }

  @Get("health")
  healthCheck(): Promise<any> {
    return this.appService.healthCheck();
  }

  /**
   * Reports what the app believes the client IP is. Probes and in-cluster traffic reach
   * the pod directly, so this is how the `trust proxy` chain gets verified in an
   * environment before anything is allowed to depend on `req.ip`.
   */
  @Get("ip")
  getIp(@Req() req: Request): any {
    return ApiResponse(
      {
        ip: req.ip,
        forwarded_for: req.headers["x-forwarded-for"] ?? null,
        remote_address: req.socket?.remoteAddress ?? null,
      },
      "Client IP retrieved successfully",
      HttpStatus.OK,
    );
  }
}
