import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { transformValue } from "@soundcircle/shared/utils/util/utils";

/** "" | "null" | "undefined" in a request body become null, before validation runs. */
export class ReqBodyTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Request> {
    transformValue(context.switchToHttp().getRequest().body);
    return next.handle();
  }
}
