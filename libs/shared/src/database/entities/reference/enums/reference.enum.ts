/** Persisted `smallint` values (schema-design §3). Never renumbered. */

/**
 * `locations.level` — the depth in the tree (schema-design §4.2). Each depth has its ancestry column
 * (`division_id`, `district_id`, `subdistrict_id`), which is what matching reads.
 */
export enum LocationLevel {
  DIVISION = 1,
  DISTRICT = 2,
  /** An upazila or a city corporation. */
  SUBDISTRICT = 3,
  /** A metropolitan thana or an area. */
  LOCALITY = 4,
}

/** `locations.type` — what kind of place a row is. The picker groups by it; matching never reads it. */
export enum LocationType {
  DIVISION = 1,
  DISTRICT = 2,
  UPAZILA = 3,
  CITY_CORPORATION = 4,
  THANA = 5,
  AREA = 6,
}
