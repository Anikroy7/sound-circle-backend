import {
  BandMilestone,
  BandType,
  MembershipRequestStatus,
  MembershipRequestType,
  MusicalInterest,
} from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { InstrumentFamily } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { LabelledLocation } from "@apps/core-api/modules/location/location-label";
import { MediaItemView, VideoLinkView } from "@apps/core-api/modules/musician/common/types/musician-profile.type";

export interface BandMemberView {
  id: number;
  /** Set for a SoundCircle user; null for a member outside it. */
  user_id: number | null;
  is_owner: boolean;
  name: string;
  /** Their role or instrument in the band. */
  position: string | null;
  /** A SoundCircle member's profile photo, or the photo uploaded for a member outside it. */
  photo_url: string | null;
  /** What they play, from the catalogue; null when their role names no known instrument. */
  instrument: { id: number; name: string; family: InstrumentFamily | null } | null;
  joined_at: string;
  /** A SoundCircle member's public profile. */
  profile_slug: string | null;
  /** Their introduction to the band; null until they write one. */
  intro: string | null;
  intro_genres: { id: number; name: string }[];
  interests: MusicalInterest[];
  /** Their membership card's number. */
  card_code: string;
}

/** One section of the lineup: how many members play it, and how many open positions want it. */
export interface LineupSlotView {
  /** Null is "Other". */
  family: InstrumentFamily | null;
  count: number;
  needed: number;
}

/** Every milestone, unlocked (`achieved_at`) or still ahead. */
export interface MilestoneView {
  milestone: BandMilestone;
  /** Members it takes. */
  members: number;
  achieved_at: string | null;
}

/** A member's digital membership card. Public: everything on it is on the band's page already. */
export interface MembershipCardView {
  code: string;
  band: { id: number; name: string; slug: string; logo_url: string | null };
  member: {
    id: number;
    name: string;
    photo_url: string | null;
    instrument: string | null;
    is_owner: boolean;
    joined_at: string;
    profile_slug: string | null;
  };
}

/** A position the band is looking to fill. */
export interface OpenRoleView {
  id: number;
  instrument_id: number;
  instrument_name: string;
  description: string | null;
}

/** Where the signed-in viewer stands with the band, so its page offers the right action. */
export interface BandViewerView {
  signed_in: boolean;
  is_member: boolean;
  /** The live invitation or join request between the viewer and this band, if any. */
  pending_request: { id: number; type: MembershipRequestType; instrument_name: string | null } | null;
  /** Open roles whose instrument is on the viewer's profile: the only ones they may ask to fill. */
  fillable_role_ids: number[];
  /** The viewer's own line-up row, when they're in the band. */
  member_id: number | null;
  /** A member (not the owner) who hasn't seen their welcome yet: the page shows it once. */
  needs_welcome: boolean;
}

/** A band as its page and the creation wizard read it. Members' contact details are never included. */
export interface BandView {
  id: number;
  /** Null while a draft. */
  slug: string | null;
  name: string;
  bio: string;
  band_type: BandType;
  logo_url: string | null;
  published_at: string | null;
  location: LabelledLocation | null;
  genres: { id: number; name: string }[];
  members: BandMemberView[];
  photos: MediaItemView[];
  videos: VideoLinkView[];
  open_roles: OpenRoleView[];
  /** Members per section, core sections always present. */
  lineup: LineupSlotView[];
  milestones: MilestoneView[];
  /** Whether the signed-in viewer owns it — the band page shows the owner's tools only then. */
  is_owner: boolean;
  viewer: BandViewerView;
}

export interface MemberCandidateView {
  id: number;
  name: string;
  photo_url: string | null;
  instruments: string | null;
}

/** One band in the directory. */
export interface BandCardView {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  bio: string;
  band_type: BandType;
  location: string | null;
  genres: string[];
  member_count: number;
  /** Instruments of its open positions. */
  open_roles: string[];
}

/** A band the signed-in user is in, for the dashboard. */
export interface MyBandView {
  id: number;
  /** Null for a draft. */
  slug: string | null;
  name: string;
  logo_url: string | null;
  is_owner: boolean;
  is_draft: boolean;
  member_count: number;
  open_role_count: number;
}

/** An invitation or a join request, from either side. */
export interface MembershipRequestView {
  id: number;
  type: MembershipRequestType;
  status: MembershipRequestStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
  band: { id: number; name: string; slug: string | null; logo_url: string | null };
  musician: { user_id: number; name: string; slug: string | null; photo_url: string | null };
  /** What they would play; null for an invitation sent without one. */
  role: { open_role_id: number | null; instrument_id: number; name: string } | null;
}

/** The signed-in user's dashboard inbox and outbox. */
export interface MembershipInboxView {
  /** Pending: invitations to me. */
  invitations_received: MembershipRequestView[];
  /** Pending: join requests to bands I own. */
  join_requests_received: MembershipRequestView[];
  /** Recent, any status. */
  invitations_sent: MembershipRequestView[];
  join_requests_sent: MembershipRequestView[];
}

/** One of my bands as seen from a musician's profile: can I invite them, or are we already talking? */
export interface InviteOptionView {
  band: { id: number; name: string; slug: string; logo_url: string | null };
  /** `member`: already in it · `invited` / `requested`: a request is pending · null: free to invite. */
  status: "member" | "invited" | "requested" | null;
  /** The pending request, so the owner can answer a join request right from the profile. */
  request: MembershipRequestView | null;
  open_roles: OpenRoleView[];
}

/** A band's own dashboard, for its members. The request queues are the owner's only (empty for a member). */
export interface BandDashboardView {
  band: BandView;
  /** Recent invitations from this band, any status. */
  invitations: MembershipRequestView[];
  /** Pending join requests to this band. */
  join_requests: MembershipRequestView[];
}
