import { BadRequestException, ConflictException } from "@nestjs/common";
import { VideoProvider } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { Weekday } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { CustomRequest } from "@soundcircle/shared/utils/util/utils";
import { MusicianProfileService, normalizeSlots, parseVideoLinks } from "@apps/core-api/modules/musician/musician-profile.service";

const USER_ID = 7;
const BIO = "Lead guitarist from Dhanmondi with eight years of playing.";

/** A fake transaction: a manager that records writes, over a profile row at `setupStep` (or none). */
const makeDeps = (setupStep: number | null): any => {
  const profile = setupStep === null ? null : { id: 3, user_id: USER_ID, setup_step: setupStep, bio: null, band_interest: null };
  const saved: any[] = [];
  const manager = {
    findOne: jest.fn(async (entity) => (entity.name === "MusicianProfileEntity" ? profile : { id: USER_ID, name: "Tanvir Ahmed", phone: null })),
    find: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    create: jest.fn((entity, row) => ({ __entity: entity.name, ...row })),
    save: jest.fn(async (row) => {
      saved.push(row);
      if (!Array.isArray(row) && !row.id) Object.assign(row, { id: 3 });
      return row;
    }),
    softRemove: jest.fn(async () => undefined),
    update: jest.fn(async () => undefined),
  };
  const deps = {
    profile,
    saved,
    manager,
    dataSource: { transaction: jest.fn(async (work) => work(manager)) },
    musicianProfileRepository: { getByUserId: jest.fn(async () => profile) },
    userRepository: { getOne: jest.fn(async () => ({ id: USER_ID, phone: null, phone_visibility: 4 })) },
    empty: { getByProfileId: jest.fn(async () => []) },
    instrumentRepository: { getExistingIds: jest.fn(async (ids) => ids) },
    genreRepository: { getExistingIds: jest.fn(async (ids) => ids.filter((id: number) => id < 100)) },
    mediaService: {
      getByOwners: jest.fn(async () => []),
      verifyProfilePhoto: jest.fn(async (_userId: number, publicId: string) => ({
        public_id: publicId,
        secure_url: `https://res.cloudinary.com/x/${publicId}.webp`,
      })),
      destroyImage: jest.fn(async () => undefined),
    },
    userLocationRepository: { getByUserId: jest.fn(async () => []) },
    // Ids under 1000 exist; 30 is Dhaka division and covers 2015 (Savar).
    locationRepository: {
      getByIds: jest.fn(async (ids: number[]) =>
        ids
          .filter((id) => id < 1000 || id === 2015)
          .map((id) => ({ id, name: `Place ${id}`, division_id: id === 2015 ? 30 : id, district_id: null, subdistrict_id: null })),
      ),
    },
  };
  return deps;
};

const makeService = (deps: any): MusicianProfileService =>
  new MusicianProfileService(
    deps.dataSource,
    deps.musicianProfileRepository,
    deps.empty,
    deps.empty,
    deps.empty,
    deps.empty,
    deps.empty,
    deps.userRepository,
    deps.instrumentRepository,
    deps.genreRepository,
    deps.mediaService,
    deps.userLocationRepository,
    deps.locationRepository,
  );

const asUser = <T>(fn: () => T): T => CustomRequest.run({ user_agent: "jest", ip_address: "127.0.0.1", user: { getId: () => USER_ID } as any }, fn);

describe("MusicianProfileService steps", () => {
  it("creates the profile on step 1, with a slug from the user's name", async () => {
    const deps = makeDeps(null);
    await asUser(() => makeService(deps).saveAbout({ bio: BIO, location_ids: [30] }));

    const created = deps.saved.find((row: any) => row.__entity === "MusicianProfileEntity");
    expect(created).toMatchObject({ user_id: USER_ID, slug: "tanvir-ahmed-7" });
  });

  it("refuses a later step before the profile exists", async () => {
    const deps = makeDeps(null);

    await expect(asUser(() => makeService(deps).saveBandInterest({ band_interest: 2 }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses to skip ahead, and writes nothing", async () => {
    const deps = makeDeps(1);
    const save = asUser(() => makeService(deps).saveInstruments({ instruments: [{ instrument_id: 3, skill_level: 2 }] }));

    await expect(save).rejects.toThrow("earlier steps");
    expect(deps.manager.save).not.toHaveBeenCalled();
  });

  it("advances setup_step and recomputes completion", async () => {
    const deps = makeDeps(5);
    deps.manager.count.mockResolvedValue(1);
    await asUser(() => makeService(deps).saveBandInterest({ band_interest: 2 }));

    expect(deps.profile.setup_step).toBe(6);
    expect(deps.profile.band_interest).toBe(2);
    expect(deps.profile.profile_completion).toBeGreaterThan(0);
    expect(deps.profile.is_discoverable).toBe(true);
  });

  it("never moves setup_step backwards when an earlier step is re-saved", async () => {
    const deps = makeDeps(6);
    await asUser(() => makeService(deps).saveAbout({ bio: BIO, location_ids: [30] }));

    expect(deps.profile.setup_step).toBe(6);
  });

  it("rejects an unknown genre before opening a transaction", async () => {
    const deps = makeDeps(1);

    await expect(asUser(() => makeService(deps).saveGenres({ performs_genre_ids: [1, 999] }))).rejects.toThrow("999");
    expect(deps.dataSource.transaction).not.toHaveBeenCalled();
  });

  it("stores the phone as public or private, stamping the actor because update() fires no hooks", async () => {
    const deps = makeDeps(3);
    await asUser(() => makeService(deps).saveContact({ phone: "+8801712345678", show_phone: true }));

    expect(deps.manager.update).toHaveBeenCalledWith(
      expect.anything(),
      USER_ID,
      expect.objectContaining({ phone: "+8801712345678", phone_visibility: 1, updated_by: USER_ID }),
    );
  });

  it("turns a phone already on another account into 409", async () => {
    const deps = makeDeps(3);
    deps.manager.update.mockRejectedValue(Object.assign(new Error("duplicate"), { code: "23505" }));

    const save = asUser(() => makeService(deps).saveContact({ phone: "+8801712345678", show_phone: false }));
    await expect(save).rejects.toBeInstanceOf(ConflictException);
    await expect(save).rejects.toThrow("another account");
  });

  it("saves step 1's locations, dropping a pick a wider pick already covers", async () => {
    const deps = makeDeps(null);
    await asUser(() => makeService(deps).saveAbout({ bio: BIO, location_ids: [30, 2015] }));

    const added = deps.saved.flat().filter((row: any) => row.__entity === "UserLocationEntity");
    expect(added).toEqual([expect.objectContaining({ user_id: USER_ID, location_id: 30 })]);
  });

  it("edits the locations on their own without moving setup_step, and recomputes completion", async () => {
    const deps = makeDeps(8);
    deps.manager.find.mockResolvedValueOnce([{ user_id: USER_ID, location_id: 99 }]);
    deps.manager.count.mockResolvedValue(1);
    await asUser(() => makeService(deps).saveLocations({ location_ids: [30] }));

    expect(deps.profile.setup_step).toBe(8);
    expect(deps.manager.softRemove).toHaveBeenCalledWith([expect.objectContaining({ location_id: 99 })]);
    expect(deps.saved.flat()).toContainEqual(expect.objectContaining({ __entity: "UserLocationEntity", location_id: 30 }));
    expect(deps.profile.profile_completion).toBeGreaterThan(0);
  });

  it("refuses an unknown location on the profile page too", async () => {
    const deps = makeDeps(8);

    await expect(asUser(() => makeService(deps).saveLocations({ location_ids: [5000] }))).rejects.toBeInstanceOf(BadRequestException);
    expect(deps.dataSource.transaction).not.toHaveBeenCalled();
  });

  it("rejects an unknown location before opening a transaction", async () => {
    const deps = makeDeps(1);

    await expect(asUser(() => makeService(deps).saveAbout({ bio: BIO, location_ids: [30, 5000] }))).rejects.toThrow("5000");
    expect(deps.dataSource.transaction).not.toHaveBeenCalled();
  });

  it("replaces the profile photo, destroying the old one only after the save", async () => {
    const deps = makeDeps(2);
    Object.assign(deps.profile, { photo_public_id: "soundcircle/users/7/avatar/old", photo_url: "https://old" });
    await asUser(() => makeService(deps).setPhoto({ public_id: "soundcircle/users/7/avatar/new" }));

    expect(deps.profile).toMatchObject({ photo_public_id: "soundcircle/users/7/avatar/new", photo_url: expect.stringContaining("/avatar/new") });
    expect(deps.mediaService.destroyImage).toHaveBeenCalledWith("soundcircle/users/7/avatar/old");
    expect(deps.mediaService.destroyImage).not.toHaveBeenCalledWith("soundcircle/users/7/avatar/new");
    expect(deps.profile.profile_completion).toBe(5);
  });

  it("destroys a new photo whose save fails, and keeps the old one", async () => {
    const deps = makeDeps(2);
    Object.assign(deps.profile, { photo_public_id: "soundcircle/users/7/avatar/old" });
    deps.manager.save.mockRejectedValueOnce(new Error("db down"));

    await expect(asUser(() => makeService(deps).setPhoto({ public_id: "soundcircle/users/7/avatar/new" }))).rejects.toThrow("db down");
    expect(deps.mediaService.destroyImage).toHaveBeenCalledWith("soundcircle/users/7/avatar/new");
    expect(deps.mediaService.destroyImage).not.toHaveBeenCalledWith("soundcircle/users/7/avatar/old");
  });

  it("removes the profile photo and its Cloudinary asset", async () => {
    const deps = makeDeps(8);
    Object.assign(deps.profile, { photo_public_id: "soundcircle/users/7/avatar/old", photo_url: "https://old" });
    await asUser(() => makeService(deps).removePhoto());

    expect(deps.profile).toMatchObject({ photo_public_id: null, photo_url: null });
    expect(deps.mediaService.destroyImage).toHaveBeenCalledWith("soundcircle/users/7/avatar/old");
  });

  it("will not finish step 8 with 'yes' and no bands", async () => {
    const deps = makeDeps(7);

    await expect(asUser(() => makeService(deps).completeBandExperience({ has_band_experience: true }))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("normalizeSlots", () => {
  it("keeps day-only, time-only and specific slots", () => {
    expect(
      normalizeSlots([
        { day_of_week: Weekday.FRIDAY },
        { day_of_week: Weekday.SATURDAY, start_time: "16:00", end_time: "20:00" },
        { start_time: "18:00", end_time: "22:00" },
      ]),
    ).toEqual([
      { day_of_week: Weekday.FRIDAY, start_time: null, end_time: null },
      { day_of_week: Weekday.SATURDAY, start_time: "16:00", end_time: "20:00" },
      { day_of_week: null, start_time: "18:00", end_time: "22:00" },
    ]);
  });

  it("allows a slot that runs past midnight", () => {
    expect(normalizeSlots([{ day_of_week: Weekday.FRIDAY, start_time: "22:00", end_time: "02:00" }])).toHaveLength(1);
  });

  it.each([
    ["a start without an end", [{ start_time: "16:00" }]],
    ["an empty range", [{ start_time: "16:00", end_time: "16:00" }]],
    ["a duplicate", [{ day_of_week: Weekday.FRIDAY }, { day_of_week: Weekday.FRIDAY }]],
    ["'any day, any time' beside another slot", [{}, { day_of_week: Weekday.FRIDAY }]],
  ])("refuses %s", (_, slots: any) => {
    expect(() => normalizeSlots(slots)).toThrow(BadRequestException);
  });
});

describe("parseVideoLinks", () => {
  it("detects each link's platform", () => {
    expect(parseVideoLinks(["https://youtu.be/dQw4w9WgXcQ", "https://fb.watch/aBc12_dE-f/"], 5).map((link) => link.provider)).toEqual([
      VideoProvider.YOUTUBE,
      VideoProvider.FACEBOOK,
    ]);
  });

  it("refuses a non-video link, naming it", () => {
    expect(() => parseVideoLinks(["https://soundcloud.com/a/b"], 5)).toThrow("soundcloud.com");
  });

  it("refuses the same video twice, however it is written", () => {
    expect(() => parseVideoLinks(["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"], 5)).toThrow("twice");
  });

  it("refuses more than the limit", () => {
    expect(() => parseVideoLinks(Array(6).fill("https://youtu.be/dQw4w9WgXcQ"), 5)).toThrow("up to 5");
  });
});
