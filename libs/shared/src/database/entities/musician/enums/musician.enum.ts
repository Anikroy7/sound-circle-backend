/** Persisted `smallint` values (schema-design §3). Never renumbered. */

/** `musician_instruments.skill_level`. */
export enum SkillLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  PROFESSIONAL = 4,
}

/** `musician_genres.relation`: a genre the musician plays, or one they listen to. One genre can be both (two rows). */
export enum GenreRelation {
  PERFORMS = 1,
  LISTENS = 2,
}

/** `musician_availability_slots.day_of_week`, ISO numbering. "Any day" is a null column, not a value here. */
export enum Weekday {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

/** `musician_profiles.band_interest` — profile setup step 6. */
export enum BandInterest {
  NOT_INTERESTED = 1,
  /** Wants a band and would join an existing one. */
  OPEN_TO_EXISTING_BAND = 2,
  /** Wants a band, but would rather start a new one. */
  NEW_BAND_ONLY = 3,
}
