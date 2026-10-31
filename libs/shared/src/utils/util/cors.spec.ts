import { corsOrigins } from "@soundcircle/shared/utils/util/cors";
import { ENV } from "@soundcircle/shared/utils/util/constant";

describe("corsOrigins", () => {
  const original = ENV.CORS_ALLOWED_ORIGINS;

  afterEach(() => {
    ENV.CORS_ALLOWED_ORIGINS = original;
  });

  it("splits and trims a comma-separated list", () => {
    ENV.CORS_ALLOWED_ORIGINS = "http://localhost:3000, http://localhost:3001";

    expect(corsOrigins()).toEqual(["http://localhost:3000", "http://localhost:3001"]);
  });

  /**
   * The point of the allow-list — a misconfigured environment must allow NOTHING, not fall back to
   * a wildcard. These requests carry header-borne credentials.
   */
  it("returns an empty allow-list rather than a wildcard when unset", () => {
    delete ENV.CORS_ALLOWED_ORIGINS;

    expect(corsOrigins()).toEqual([]);
    expect(corsOrigins()).not.toContain("*");
  });

  it("drops empty entries from a trailing or doubled comma", () => {
    ENV.CORS_ALLOWED_ORIGINS = "http://a.test,,http://b.test,";

    expect(corsOrigins()).toEqual(["http://a.test", "http://b.test"]);
  });
});
