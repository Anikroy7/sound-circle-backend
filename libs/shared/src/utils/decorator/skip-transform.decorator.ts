import { CustomDecorator, SetMetadata } from "@nestjs/common";

export const SKIP_RESPONSE_INTERCEPTOR_KEY = "SKIP_RESPONSE_INTERCEPTOR";

/** Opts a handler out of the response envelope — file downloads, ESB passthrough. */
export const SkipResponseInterceptor = (): CustomDecorator<string> => SetMetadata(SKIP_RESPONSE_INTERCEPTOR_KEY, true);
