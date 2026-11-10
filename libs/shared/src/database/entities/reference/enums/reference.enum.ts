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

/**
 * `instruments.family` — the section of a band an instrument plays in. The band page's lineup counts
 * members per family, so a "Bass guitar" and a "Double bass" would both fill the bass chair.
 */
export enum InstrumentFamily {
  VOCALS = 1,
  GUITAR = 2,
  BASS = 3,
  DRUMS = 4,
  KEYS = 5,
  PERCUSSION = 6,
  STRINGS = 7,
  WINDS = 8,
  ELECTRONIC = 9,
}
