/**
 * The ONLY file in the repository that reads `process.env`. Everything else reads
 * `ENV.<VAR>`. `@nestjs/config` is deliberately not installed.
 */
export const ENV = process.env;

export const DEFAULT_PAGE_NO = 1;
export const DEFAULT_PAGE_SIZE = 10;

/** Postgres `unique_violation` — a unique index caught a duplicate the pre-check missed. */
export const PG_UNIQUE_VIOLATION = "23505";
