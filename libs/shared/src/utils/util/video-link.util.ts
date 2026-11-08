import { VideoProvider } from "@soundcircle/shared/database/entities/media/enums/media.enum";

export interface ParsedVideoLink {
  provider: VideoProvider;
  /** What identifies the video on its platform; an embed is built from this, never from the raw URL. */
  external_video_id: string;
  /** The URL as entered, trimmed, with `https://` added when the scheme was left off. */
  url: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const NUMERIC_ID = /^\d{5,20}$/;
const FB_WATCH_CODE = /^[A-Za-z0-9_-]{4,40}$/;

const host = (url: URL): string => url.hostname.toLowerCase().replace(/^(www|m|mobile|web|music)\./, "");
const segments = (url: URL): string[] => url.pathname.split("/").filter(Boolean);

const youtube = (url: URL): string | null => {
  const h = host(url);
  if (h === "youtu.be") return segments(url)[0] ?? null;
  if (h !== "youtube.com" && h !== "youtube-nocookie.com") return null;

  const [first, second] = segments(url);
  if (first === "watch") return url.searchParams.get("v");
  if (["shorts", "embed", "live", "v"].includes(first)) return second ?? null;
  return null;
};

const vimeo = (url: URL): string | null => {
  const h = host(url);
  if (h === "player.vimeo.com") return segments(url)[0] === "video" ? (segments(url)[1] ?? null) : null;
  if (h !== "vimeo.com") return null;
  // vimeo.com/123456, vimeo.com/channels/staffpicks/123456: the numeric segment is the id.
  return segments(url).find((segment) => NUMERIC_ID.test(segment)) ?? null;
};

const facebook = (url: URL): string | null => {
  const h = host(url);
  if (h === "fb.watch") {
    const code = segments(url)[0];
    return code && FB_WATCH_CODE.test(code) ? code : null;
  }
  if (h !== "facebook.com" && h !== "fb.com") return null;

  const parts = segments(url);
  // facebook.com/watch?v=123 · facebook.com/watch/?v=123
  if (parts[0] === "watch") return url.searchParams.get("v");
  // facebook.com/reel/123 · facebook.com/<page>/videos/123 · facebook.com/<page>/videos/<title>/123
  if (parts[0] === "reel" || parts.includes("videos")) return [...parts].reverse().find((segment) => NUMERIC_ID.test(segment)) ?? null;
  return null;
};

const PARSERS: [VideoProvider, (url: URL) => string | null, RegExp][] = [
  [VideoProvider.YOUTUBE, youtube, YOUTUBE_ID],
  [VideoProvider.VIMEO, vimeo, NUMERIC_ID],
  [VideoProvider.FACEBOOK, facebook, /^(\d{5,20}|[A-Za-z0-9_-]{4,40})$/],
];

/**
 * A YouTube, Facebook or Vimeo video link, or null for anything else — including a platform's
 * non-video pages (a channel, a profile). Video files are never uploaded (schema-design §4.4).
 */
export const parseVideoLink = (raw: string): ParsedVideoLink | null => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed.length > 512) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  for (const [provider, parse, idPattern] of PARSERS) {
    const id = parse(url);
    if (id && idPattern.test(id)) return { provider, external_video_id: id, url: url.toString() };
  }
  return null;
};
