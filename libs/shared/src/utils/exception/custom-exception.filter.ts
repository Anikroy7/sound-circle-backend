import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { CannotCreateEntityIdMapError, EntityNotFoundError, QueryFailedError } from "typeorm";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { getFormattedDateTime } from "@soundcircle/shared/utils/util/utils";

/**
 * The error envelope: `{ success: false, status_code, message, code, timestamp, path, method }`.
 *
 * Nothing here logs a header — `authorization` never reaches the log.
 */
@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code = "HttpException";
    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = "Something went wrong!";
    let error_code = null; // custom error code

    switch (exception.constructor) {
      case BadRequestException:
        status = (exception as any).getStatus();
        const exceptionResponse = (exception as any).getResponse();
        message = exceptionResponse?.message ? exceptionResponse.message : exceptionResponse;
        code = "BadRequestException";
        error_code = exceptionResponse?.error_code ?? null;
        break;
      case UnprocessableEntityException:
        status = (exception as any).getStatus();
        message = (exception as any).getResponse().message;
        code = "UnprocessableEntityException";
        break;
      case ForbiddenException:
        status = (exception as any).getStatus();
        message = (exception as any).getResponse().message;
        code = "ForbiddenException";
        break;
      case UnauthorizedException:
        status = (exception as any).getStatus();
        message = (exception as any).getResponse().message;
        code = "UnauthorizedException";
        break;
      case NotFoundException:
        // Also the deliberate answer to a cross-owner read on an addressed row — a 403
        // would confirm the resource exists.
        status = HttpStatus.NOT_FOUND;
        message = (exception as any).getResponse()?.message ?? "Resource not found";
        code = "NotFoundException";
        break;
      case QueryFailedError: // this is a TypeOrm error
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = (exception as QueryFailedError).message;
        code = (exception as any).code;
        break;
      case EntityNotFoundError: // this is another TypeOrm error
        const errMessage = exception?.message?.split("matching")?.[0]?.replace(/"/g, "")?.trim();
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = errMessage ?? "Entity not found";
        code = (exception as any).code;
        break;
      case CannotCreateEntityIdMapError: // and another
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = (exception as CannotCreateEntityIdMapError).message;
        code = (exception as any).code;
        break;
      case TypeError:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = (exception as any).message;
        code = (exception as any).code;
        break;
      default:
        // Any other HttpException subclass keeps its own status and message.
        if (exception instanceof HttpException) {
          status = exception.getStatus();
          const res: any = exception.getResponse();
          message = res?.message ?? res ?? message;
          code = exception.constructor?.name ?? "HttpException";
        } else if (exception?.code === "ENOENT") {
          // File exceptions
          status = HttpStatus.BAD_REQUEST;
          message = "File Not Found";
          code = "NotFoundException";
        }
    }

    this.logger.error(`message: ${JSON.stringify(message)}, method: ${request.method}, path: ${request.url}`);
    this.logger.error((exception as any).stack);

    response.status(status).json(GlobalResponseError(status, message, code, request, error_code));
  }
}

const GlobalResponseError = (statusCode: number, message: any, code: string, request: Request, error_code?: string): IResponseError => {
  return {
    success: false,
    status_code: statusCode,
    message,
    code,
    timestamp: getFormattedDateTime(),
    path: request.url,
    method: request.method,
    error_code: error_code ?? undefined, // custom error code
  };
};

export interface IResponseError {
  success: boolean;
  status_code: number;
  message: any;
  code: string;
  timestamp: string;
  path: string;
  method: string;
  error_code?: string;
}
