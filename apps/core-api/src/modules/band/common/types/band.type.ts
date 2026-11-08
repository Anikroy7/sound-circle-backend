import { BandType } from "@soundcircle/shared/database/entities/band/enums/band.enum";
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
  /** Whether the signed-in viewer owns it — the band page shows Invite Members only then. */
  is_owner: boolean;
}

export interface MemberCandidateView {
  id: number;
  name: string;
  photo_url: string | null;
  instruments: string | null;
}
