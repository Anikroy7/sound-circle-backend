import { BadRequestException } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { isArray, isObject, isString } from "class-validator";
import { Request } from "express";
import moment from "moment";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";

/**
 * The per-request context, written once by `RequestContextMiddleware`.
 *
 * `user` is the signed-in user. ⚠ Always null until auth lands (schema-design §8) — so
 * every `created_by` is null for now, while `created_ip` is already stamped.
 */
export interface CustomRequestType {
  user_agent: string;
  ip_address: string;
  user: UserEntity | null;
}

/**
 * The current actor, anywhere. Never pass the user as a parameter and never read it
 * from a header — this is the single accessor.
 */
export const AuthUser = {
  get(): any {
    return CustomRequest.get()?.user ?? null;
  },
};

/** The current request's IP, anywhere. Same accessor pattern as `AuthUser`. */
export const RequestIp = {
  get(): string | null {
    return CustomRequest.get()?.ip_address ?? null;
  },
};

export const CustomRequest = {
  storage: new AsyncLocalStorage<CustomRequestType>(),
  get(): CustomRequestType {
    return this.storage.getStore();
  },
  /**
   * Runs `fn` — the rest of the request pipeline — with `req` as its context.
   * ⚠ `run`, never `enterWith`: called before the middleware's first `await`, `enterWith`
   * writes into the connection's async context and survives into its next keep-alive request.
   */
  run<T>(req: CustomRequestType, fn: () => T): T {
    return this.storage.run(req, fn);
  },
};

/** Every controller returns this. `ResponseInterceptor` wraps it into the envelope. */
export const ApiResponse: any = (
  data: any,
  message?: any,
  status_code?: any,
): {
  data: any;
  message: any;
  status_code: any;
} => {
  return { data, message, status_code };
};

const ValidationErrorFormatter = (errors): any => {
  const errorObj = {};
  errors.forEach((error) => {
    if (error.children && error.children.length > 0) {
      errorObj[error.property] = ValidationErrorFormatter(error.children);
    } else {
      errorObj[error.property] = error.constraints;
    }
  });
  return errorObj;
};

export const validationErrorHandling = (errors): any => {
  const errorObj = ValidationErrorFormatter(errors);
  return new BadRequestException(errorObj);
};

export const getFormattedDateTime = (date: Date | moment.Moment | string = new Date(), format = "YYYY-MM-DD HH:mm:ss"): string => {
  return moment(date).format(format);
};

/** "" | "null" | "undefined" → null, recursively. Used by `ReqBodyTransformInterceptor`. */
export const transformValue = (data: any, fromValues = ["", "null", undefined, "undefined"], toValue = null): any => {
  if (isArray(data)) {
    data.forEach((value, index) => {
      if (isString(value) && fromValues.includes(value)) {
        data[index] = toValue;
      } else {
        transformValue(value);
      }
    });
  } else if (isObject(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (isString(value) && fromValues.includes(value)) {
        data[key] = toValue;
      } else {
        transformValue(value);
      }
    }
  }
  return data;
};

export const enumToString = (data: any, excludeValues?: any[]): string => {
  const enumToArrayObject: any = Object?.keys(data)
    ?.filter((key) => isNaN(Number(key)))
    ?.map((key) => ({ key: key, value: data[key] }))
    ?.filter(({ value }) => !excludeValues?.includes(value));

  return enumToArrayObject?.map(({ key, value }) => key + " = " + value).join("  ||  ") ?? null;
};

export const enumValuesToArray = (data: any, excludeValues?: any[]): any => {
  const enumToArrayObject: any[] = Object?.keys(data)
    ?.filter((key) => isNaN(Number(key)))
    ?.map((key) => ({ key: key, value: data[key] }))
    ?.filter(({ value }) => !excludeValues?.includes(value));

  return enumToArrayObject?.map(({ value }) => value) ?? [];
};

/** The client IP as Express resolves it under `trust proxy` (set in `main.ts`). */
export function getRequestIpAddress(req: Request): string {
  return req?.ip?.toString();
}
