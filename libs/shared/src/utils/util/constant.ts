/**
 * The ONLY file in the repository that reads `process.env`. Everything else reads
 * `ENV.<VAR>`. `@nestjs/config` is deliberately not installed.
 */
export const ENV = process.env;

export const DEFAULT_PAGE_NO = 1;
export const DEFAULT_PAGE_SIZE = 10;

/** The most available locations one user may pick (schema-design §4.1). */
export const MAX_USER_LOCATIONS = 20;

/** `GET /locations?near_location_id=` — the radius when none is given, and the most allowed (Bangladesh is ~750 km tall). */
export const DEFAULT_NEAR_RADIUS_KM = 10;
export const MAX_NEAR_RADIUS_KM = 300;

/** Postgres `unique_violation` — a unique index caught a duplicate the pre-check missed. */
export const PG_UNIQUE_VIOLATION = "23505";
