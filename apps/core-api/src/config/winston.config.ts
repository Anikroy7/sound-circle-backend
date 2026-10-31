import { format, transports } from "winston";
import "winston-daily-rotate-file";
import { ENV } from "@soundcircle/shared/utils/util/constant";
import { AppEnvironment } from "@soundcircle/shared/utils/util/enums";

const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: "%DATE%.log",
  dirname: "apps/core-api/logs",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "7d",
});

/**
 * Console locally, daily-rotate file everywhere else.
 *
 * Nothing here logs a request header. `user-token`, `authorization` and `x-api-key` must
 * never reach a log file — if a transport is added that serialises the
 * request, it redacts those three first.
 */
export const winstonConfig = {
  level: ENV.LOG_LEVEL ?? "info",
  format: format.combine(
    format.timestamp(),
    format.printf((msg) => {
      return `${msg.timestamp} - [${msg.level}] - ${msg.message}`;
    }),
  ),
  transports: ENV.APP_ENV === AppEnvironment.LOCAL ? [new transports.Console()] : [dailyRotateFileTransport],
};
