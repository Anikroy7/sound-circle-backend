/** Persisted `smallint` values (schema-design §3). Never renumbered. */

/** `bands.band_type`: chosen in creation step 1. */
export enum BandType {
  /** Newly forming: still putting the line-up together. */
  NEW = 1,
  /** Already playing together. */
  EXISTING = 2,
}

/** `band_members.role`. The creator is the `OWNER`; there is exactly one. */
export enum BandMemberRole {
  OWNER = 1,
  MEMBER = 2,
}
