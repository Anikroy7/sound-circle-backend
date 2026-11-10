import { BandInterest, SkillLevel, Weekday } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { LocationLevel, LocationType } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { MediaType, VideoProvider } from "@soundcircle/shared/database/entities/media/enums/media.enum";

export interface MediaItemView {
  id: number;
  media_type: MediaType;
  file_name: string | null;
  secure_url: string;
  format: string;
  file_size: number;
  duration_seconds: number | null;
}

export interface VideoLinkView {
  id: number;
  provider: VideoProvider;
  external_video_id: string;
  url: string;
}

/** One of the musician's locations (`user_locations`), any level. */
export interface ProfileLocationView {
  id: number;
  level: LocationLevel;
  type: LocationType;
  name: string;
  name_bn: string | null;
  /** The place and the places above it, narrowest first: "Mirpur, Dhaka North City Corporation, Dhaka". */
  label: string;
  /** Its division / district / upazila ids (whichever exist), so a client can tell a wider pick covers it. */
  ancestor_ids: number[];
}

export interface BandExperienceView {
  id: number;
  band_name: string;
  role: string;
  is_current: boolean;
  photos: MediaItemView[];
  videos: VideoLinkView[];
}

/**
 * The signed-in musician's whole profile as the setup wizard reads it: one shape for `GET /profiles/me`
 * and every step's response, so the client never stitches partial answers together.
 * ⚠ Unmasked (the phone is the owner's own) — never return this for another user.
 */
export interface MusicianProfileView {
  /** Null until step 1 creates the profile. */
  id: number | null;
  slug: string | null;
  setup_step: number;
  profile_completion: number;
  is_discoverable: boolean;
  /** The profile photo's Cloudinary URL; null for none. */
  photo_url: string | null;
  bio: string | null;
  /** Where the musician is based or can play, widest first. */
  locations: ProfileLocationView[];
  performs_genre_ids: number[];
  listens_genre_ids: number[];
  instruments: { instrument_id: number; skill_level: SkillLevel }[];
  phone: string | null;
  show_phone: boolean;
  /** Times as `HH:MM`; null = any day / any time. */
  availability: { day_of_week: Weekday | null; start_time: string | null; end_time: string | null }[];
  band_interest: BandInterest | null;
  audio: MediaItemView[];
  photos: MediaItemView[];
  videos: VideoLinkView[];
  band_experiences: BandExperienceView[];
}

/**
 * Anyone's profile, for visitors too: the owner's view with contact masked (the phone only when public,
 * never the email) and the setup bookkeeping left out.
 */
export interface PublicMusicianView extends Omit<MusicianProfileView, "id" | "slug" | "phone" | "show_phone" | "setup_step" | "is_discoverable"> {
  id: number;
  slug: string;
  user_id: number;
  name: string;
  /** Null unless the musician made it public. */
  phone: string | null;
  /** The signed-in viewer is this musician. */
  is_self: boolean;
}

/** One musician in the discovery results. */
export interface MusicianCardView {
  user_id: number;
  slug: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  band_interest: BandInterest | null;
  /** Best first. */
  instruments: string[];
  /** Genres performed. */
  genres: string[];
  /** Their widest location, labelled: "Dhaka". */
  location: string | null;
  /** How many more locations they listed. */
  more_locations: number;
}

/** A page of search results. */
export interface SearchPage<T> {
  items: T[];
  meta: { total: number; page: number; page_size: number; total_pages: number };
}
