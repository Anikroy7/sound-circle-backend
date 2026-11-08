import { createHash } from "crypto";
import { signCloudinaryParams } from "@soundcircle/shared/utils/util/cloudinary.util";

describe("signCloudinaryParams", () => {
  /* The example from Cloudinary's "Generating authentication signatures" docs. */
  it("matches Cloudinary's documented example", () => {
    const signature = signCloudinaryParams(
      { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
      "abcd",
    );

    expect(signature).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("sorts the parameters, so their order does not matter", () => {
    const a = signCloudinaryParams({ timestamp: 1, public_id: "x", overwrite: false }, "secret");
    const b = signCloudinaryParams({ overwrite: false, public_id: "x", timestamp: 1 }, "secret");

    expect(a).toBe(b);
  });

  it("leaves out the parameters Cloudinary does not sign", () => {
    const signed = signCloudinaryParams({ public_id: "x", timestamp: 1, api_key: "k", resource_type: "video", cloud_name: "c" }, "secret");

    expect(signed).toBe(createHash("sha1").update("public_id=x&timestamp=1secret").digest("hex"));
  });

  it("changes when any signed parameter changes", () => {
    const original = signCloudinaryParams({ public_id: "soundcircle/users/7/audio/a", timestamp: 1 }, "secret");
    const tampered = signCloudinaryParams({ public_id: "soundcircle/users/8/audio/a", timestamp: 1 }, "secret");

    expect(tampered).not.toBe(original);
  });

  it("refuses to sign without a secret", () => {
    expect(() => signCloudinaryParams({ timestamp: 1 }, "")).toThrow();
  });
});
