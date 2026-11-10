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

/** `band_open_roles.status`. */
export enum OpenRoleStatus {
  OPEN = 1,
  /** An accepted request filled it. */
  FILLED = 2,
  /** The owner took it down. */
  CLOSED = 3,
}

/** `band_membership_requests.type`: who asked whom. */
export enum MembershipRequestType {
  /** Band → musician: the owner invited them. */
  INVITATION = 1,
  /** Musician → band: they asked to join. */
  JOIN_REQUEST = 2,
}

/** `band_membership_requests.status`. */
export enum MembershipRequestStatus {
  PENDING = 1,
  ACCEPTED = 2,
  DECLINED = 3,
  /** Withdrawn by whoever sent it. */
  CANCELLED = 4,
  /** Unanswered past `expires_at`. */
  EXPIRED = 5,
}

/** `band_milestones.milestone`: unlocked once, never re-locked when a member later leaves. */
export enum BandMilestone {
  /** Someone besides the owner joined: 2 members. */
  FIRST_MEMBER = 1,
  THREE_MEMBERS = 2,
  /** A four-piece. */
  FULL_BAND = 3,
  FIVE_MEMBERS = 4,
}

/** `band_member_interests.interest`: what a member wants out of the band, from their introduction. */
export enum MusicalInterest {
  ORIGINALS = 1,
  COVERS = 2,
  SONGWRITING = 3,
  LIVE_GIGS = 4,
  RECORDING = 5,
  JAMMING = 6,
  TOURING = 7,
  PRODUCTION = 8,
  IMPROVISATION = 9,
}
