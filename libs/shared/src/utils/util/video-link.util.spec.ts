import { VideoProvider } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { parseVideoLink } from "@soundcircle/shared/utils/util/video-link.util";

describe("parseVideoLink", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", VideoProvider.YOUTUBE, "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", VideoProvider.YOUTUBE, "dQw4w9WgXcQ"],
    ["youtube.com/shorts/dQw4w9WgXcQ", VideoProvider.YOUTUBE, "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", VideoProvider.YOUTUBE, "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", VideoProvider.YOUTUBE, "dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", VideoProvider.VIMEO, "76979871"],
    ["https://player.vimeo.com/video/76979871", VideoProvider.VIMEO, "76979871"],
    ["https://www.facebook.com/watch/?v=1234567890123", VideoProvider.FACEBOOK, "1234567890123"],
    ["https://www.facebook.com/someband/videos/1234567890123/", VideoProvider.FACEBOOK, "1234567890123"],
    ["https://web.facebook.com/someband/videos/live-at-tsc/1234567890123", VideoProvider.FACEBOOK, "1234567890123"],
    ["https://www.facebook.com/reel/1234567890123", VideoProvider.FACEBOOK, "1234567890123"],
    ["https://fb.watch/aBc12_dE-f/", VideoProvider.FACEBOOK, "aBc12_dE-f"],
  ])("recognises %s", (url, provider, id) => {
    expect(parseVideoLink(url)).toMatchObject({ provider, external_video_id: id });
  });

  it("adds https:// to a link typed without a scheme", () => {
    expect(parseVideoLink("youtu.be/dQw4w9WgXcQ").url).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it.each([
    ["an empty string", ""],
    ["a non-video platform", "https://soundcloud.com/artist/track"],
    ["a YouTube channel page", "https://www.youtube.com/@someband"],
    ["a malformed YouTube id", "https://www.youtube.com/watch?v=short"],
    ["a Facebook profile", "https://www.facebook.com/someband"],
    ["a look-alike host", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["plain text", "my best performance"],
  ])("refuses %s", (_, url) => {
    expect(parseVideoLink(url)).toBeNull();
  });
});
