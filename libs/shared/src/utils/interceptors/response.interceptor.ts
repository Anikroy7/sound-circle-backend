import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { SKIP_RESPONSE_INTERCEPTOR_KEY } from "@soundcircle/shared/utils/decorator/skip-transform.decorator";

export interface Response<T> {
  success: boolean;
  status_code: number;
  message?: string;
  data: T;
}

/** The success envelope. Controllers return `ApiResponse(data, message)` and never a shape by hand. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const skip: boolean = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_INTERCEPTOR_KEY, [context.getHandler(), context.getClass()]);

    if (skip) {
      return next.handle() as Observable<any>;
    }

    return next.handle().pipe(
      map((response) => ({
        success: true,
        status_code: response?.status_code ?? context.switchToHttp().getResponse().statusCode,
        message: response?.message ?? "",
        data: response?.data ?? null,
      })),
    );
  }
}
