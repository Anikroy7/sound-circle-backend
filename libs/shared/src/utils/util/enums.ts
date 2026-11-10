/**
 * Cross-module enums only (coding-standards §1.1). An enum an entity stores lives beside
 * that entity in `database/entities/<domain>/enums/`; one used by a single module lives
 * in that module's `common/enums/`.
 *
 * Every enum here that is persisted is a `smallint`. **Numeric values are contract and
 * are never renumbered** — a retired value stays burnt.
 */

export enum RowStatus {
  INACTIVE = 0,
  ACTIVE = 1,
  PENDING = 2,
  REJECTED = 3,
  ARCHIVED = 4,
}

/**
 * The `COMMENT ON COLUMN` text for `row_status`, so `\d+` says what a 3 means.
 *
 * ⚠ **Both `AbstractEntity` and `commonColumns` must use this same constant**, or
 * `migration:generate` proposes a `COMMENT ON COLUMN … IS NULL` for every table.
 */
export const ROW_STATUS_COLUMN_COMMENT: string = `${RowStatus.ACTIVE}=> ACTIVE, ${RowStatus.INACTIVE}=> INACTIVE, ${RowStatus.PENDING}=> PENDING, ${RowStatus.REJECTED}=> REJECTED, ${RowStatus.ARCHIVED}=> ARCHIVED`;

export enum AppEnvironment {
  LOCAL = "LOCAL",
  DEV = "DEV",
  STAGING = "STAGING",
  PRODUCTION = "PRODUCTION",
}

/** `GET /musicians?sort=`: best-filled profiles first by default. Not persisted. */
export const MUSICIAN_SORTS = ["completion", "newest", "name"] as const;
export type MusicianSort = (typeof MUSICIAN_SORTS)[number];

/** `GET /bands?sort=`: newest published first by default. Not persisted. */
export const BAND_SORTS = ["newest", "name"] as const;
export type BandSort = (typeof BAND_SORTS)[number];
