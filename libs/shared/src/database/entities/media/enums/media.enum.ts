/** Persisted `smallint` values (schema-design §3). Never renumbered. */

/** `portfolio_media.owner_type` — which table `owner_id` points at (there is no FK). */
export enum MediaOwnerType {
  USER = 1,
  BAND = 2,
  BAND_EXPERIENCE = 3,
}

/** `portfolio_media.media_type`. ⚠ `VIDEO = 2` is burnt: a video is a link (`musician_video_links`), never an upload. */
export enum MediaType {
  IMAGE = 1,
  AUDIO = 3,
}

/** `musician_video_links.provider`, detected from the URL by `video-link.util.ts`. */
export enum VideoProvider {
  YOUTUBE = 1,
  VIMEO = 2,
  FACEBOOK = 3,
}
