/** Persisted `smallint` values (schema-design §3). Never renumbered. */

/** `users.email_visibility` / `users.phone_visibility` — who may read the value (schema-design §5.1). */
export enum ContactVisibility {
  PUBLIC = 1,
  MEMBERS = 2,
  BAND_MATES = 3,
  ONLY_ME = 4,
}
