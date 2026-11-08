import { BadRequestException, ConflictException } from "@nestjs/common";
import { MediaOwnerType, MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { MAX_MEDIA_FILE_BYTES } from "@soundcircle/shared/utils/util/constant";
import { MediaService } from "@apps/core-api/modules/media/media.service";
import { MediaOwner } from "@apps/core-api/modules/media/common/types/media.type";

const GALLERY: MediaOwner = { type: MediaOwnerType.USER, id: 7, limit: 10 };
const AUDIO_ID = "soundcircle/users/7/audio/0123456789abcdef01234567";

const makeDeps = (): any => {
  const cloudinary = {
    signUpload: jest.fn((resourceType, publicId, formats) => ({
      upload_url: `u/${resourceType}`,
      fields: { public_id: publicId, allowed_formats: formats.join(",") },
    })),
    getResource: jest.fn(async () => ({
      public_id: AUDIO_ID,
      resource_type: "video",
      format: "mp3",
      bytes: 4_000_000,
      secure_url: "https://res.cloudinary.com/demo/video/upload/v1/a.mp3",
      is_audio: true,
      duration: 191.6,
    })),
    destroy: jest.fn(async () => undefined),
  };
  const repository = {
    countByOwner: jest.fn(async () => 0),
    create: jest.fn((row) => ({ ...row })),
    save: jest.fn(async (row) => Object.assign(row, { id: 42 })),
    getOne: jest.fn(async (id) => ({ id })),
    softRemove: jest.fn(async () => undefined),
  };
  return { cloudinary, repository, service: new MediaService(repository as any, cloudinary as any) };
};

describe("MediaService.createUploadTicket", () => {
  it("signs a fresh public id under the owner's folder, for audio as a Cloudinary video", async () => {
    const { service, cloudinary } = makeDeps();
    await service.createUploadTicket(GALLERY, MediaType.AUDIO);

    const [resourceType, publicId, formats] = cloudinary.signUpload.mock.calls[0];
    expect(resourceType).toBe("video");
    expect(publicId).toMatch(/^soundcircle\/users\/7\/audio\/[a-f0-9]{24}$/);
    expect(formats).toContain("mp3");
  });

  it("never signs two uploads to the same id", async () => {
    const { service, cloudinary } = makeDeps();
    await service.createUploadTicket(GALLERY, MediaType.IMAGE);
    await service.createUploadTicket(GALLERY, MediaType.IMAGE);

    expect(cloudinary.signUpload.mock.calls[0][1]).not.toBe(cloudinary.signUpload.mock.calls[1][1]);
  });

  it("refuses once the owner is at its limit", async () => {
    const { service, repository, cloudinary } = makeDeps();
    repository.countByOwner.mockResolvedValue(10);

    await expect(service.createUploadTicket(GALLERY, MediaType.AUDIO)).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.signUpload).not.toHaveBeenCalled();
  });
});

describe("MediaService.attach", () => {
  it("stores what Cloudinary reports, not what the client sent", async () => {
    const { service, repository } = makeDeps();
    await service.attach(GALLERY, MediaType.AUDIO, AUDIO_ID, "  live.mp3 ");

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ file_size: 4_000_000, format: "mp3", duration_seconds: 192, file_name: "live.mp3", owner_id: 7 }),
    );
  });

  it.each([
    ["another user's folder", "soundcircle/users/8/audio/0123456789abcdef01234567"],
    ["the photo folder", "soundcircle/users/7/photos/0123456789abcdef01234567"],
    ["an id this service did not generate", "soundcircle/users/7/audio/../../8/audio/x"],
  ])("refuses a public id in %s without asking Cloudinary", async (_, publicId) => {
    const { service, cloudinary } = makeDeps();

    await expect(service.attach(GALLERY, MediaType.AUDIO, publicId)).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.getResource).not.toHaveBeenCalled();
  });

  it("destroys and refuses a file over 10 MB", async () => {
    const { service, cloudinary, repository } = makeDeps();
    cloudinary.getResource.mockResolvedValue({ ...(await cloudinary.getResource()), bytes: MAX_MEDIA_FILE_BYTES + 1 });

    await expect(service.attach(GALLERY, MediaType.AUDIO, AUDIO_ID)).rejects.toThrow("10 MB");
    expect(cloudinary.destroy).toHaveBeenCalledWith("video", AUDIO_ID);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("destroys and refuses a video file sent as audio", async () => {
    const { service, cloudinary, repository } = makeDeps();
    cloudinary.getResource.mockResolvedValue({ ...(await cloudinary.getResource()), is_audio: false });

    await expect(service.attach(GALLERY, MediaType.AUDIO, AUDIO_ID)).rejects.toThrow("That is a video file");
    expect(cloudinary.destroy).toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("destroys and refuses a format outside the allowed list", async () => {
    const { service, cloudinary } = makeDeps();
    cloudinary.getResource.mockResolvedValue({ ...(await cloudinary.getResource()), format: "mp4" });

    await expect(service.attach(GALLERY, MediaType.AUDIO, AUDIO_ID)).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.destroy).toHaveBeenCalled();
  });

  it("refuses an upload Cloudinary does not have", async () => {
    const { service, cloudinary } = makeDeps();
    cloudinary.getResource.mockResolvedValue(null);

    await expect(service.attach(GALLERY, MediaType.AUDIO, AUDIO_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  /* Several tickets can be signed before any is saved, so the limit is checked again at save time. */
  it("destroys an upload that would push the owner over its limit", async () => {
    const { service, repository, cloudinary } = makeDeps();
    repository.countByOwner.mockResolvedValue(10);

    await expect(service.attach(GALLERY, MediaType.AUDIO, AUDIO_ID)).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.destroy).toHaveBeenCalledWith("video", AUDIO_ID);
  });

  it("turns a duplicate public id into 409", async () => {
    const { service, repository } = makeDeps();
    repository.save.mockRejectedValue(Object.assign(new Error("duplicate"), { code: "23505" }));

    await expect(service.attach(GALLERY, MediaType.AUDIO, AUDIO_ID)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("MediaService.remove", () => {
  it("soft-removes the row and destroys the asset, surviving a Cloudinary failure", async () => {
    const { service, repository, cloudinary } = makeDeps();
    cloudinary.destroy.mockRejectedValue(new Error("down"));

    await service.remove({ id: 42, media_type: MediaType.IMAGE, public_id: "soundcircle/users/7/photos/x" } as any);

    expect(repository.softRemove).toHaveBeenCalled();
    expect(cloudinary.destroy).toHaveBeenCalledWith("image", "soundcircle/users/7/photos/x");
  });
});
