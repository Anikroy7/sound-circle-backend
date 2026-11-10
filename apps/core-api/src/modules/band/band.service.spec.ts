import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { BandMemberRole } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { CustomRequest } from "@soundcircle/shared/utils/util/utils";
import { BandService } from "@apps/core-api/modules/band/band.service";

const OWNER_ID = 7;
const BAND = {
  id: 3,
  name: "The Monsoon Collective",
  slug: null,
  logo_url: null,
  bio: "x".repeat(40),
  location_id: 30,
  band_type: 1,
  published_at: null,
};

/** A band owned by user 7, a fake transaction manager that records writes, and the repositories the service reads. */
const makeDeps = (): any => {
  const saved: any[] = [];
  const bandRow: any = { ...BAND };
  const members: any[] = [
    { id: 10, band_id: 3, user_id: OWNER_ID, role: BandMemberRole.OWNER, photo_public_id: null },
    { id: 11, band_id: 3, user_id: null, name: "Rafiq", role: BandMemberRole.MEMBER, photo_public_id: "soundcircle/bands/3/members/abc" },
  ];
  const manager = {
    findOne: jest.fn(async (_entity, { where }) => members.find((member) => member.id === where.id && member.band_id === where.band_id) ?? null),
    findOneOrFail: jest.fn(async () => bandRow),
    find: jest.fn(async () => []),
    count: jest.fn(async () => members.length),
    create: jest.fn((entity, row) => ({ __entity: entity.name, ...row })),
    save: jest.fn(async (row) => {
      saved.push(row);
      if (!Array.isArray(row) && !row.id) Object.assign(row, { id: row.__entity === "BandEntity" ? 3 : 99 });
      return row;
    }),
    softRemove: jest.fn(async () => undefined),
  };
  return {
    saved,
    bandRow,
    manager,
    dataSource: { transaction: jest.fn(async (work) => work(manager)) },
    bandRepository: { getOne: jest.fn(async (id) => (id === 3 ? bandRow : undefined)), getDraftByOwner: jest.fn(async () => undefined) },
    bandGenreRepository: { getByBandId: jest.fn(async () => []) },
    bandMemberRepository: {
      getByBandId: jest.fn(async () => []),
      count: jest.fn(async ({ where }) => (where.band_id === 3 && where.user_id === OWNER_ID && where.role === BandMemberRole.OWNER ? 1 : 0)),
      searchCandidates: jest.fn(async () => [{ id: 8, name: "Imran", photo_url: null, instruments: null }]),
    },
    bandVideoLinkRepository: { getByBandId: jest.fn(async () => []) },
    userRepository: { getOne: jest.fn(async (id) => (id === 8 ? { id: 8 } : undefined)) },
    genreRepository: { getExistingIds: jest.fn(async (ids) => ids) },
    locationRepository: { getByIds: jest.fn(async (ids) => ids.map((id: number) => ({ id, name: "Dhaka", division_id: id }))) },
    mediaService: {
      getByOwners: jest.fn(async () => []),
      verifyImage: jest.fn(async (_folder, publicId) => ({ public_id: publicId, secure_url: `https://res.cloudinary.com/x/${publicId}.webp` })),
      destroyImage: jest.fn(async () => undefined),
    },
    bandOpenRoleRepository: { getOpenByBandId: jest.fn(async () => []) },
    bandMembershipRequestRepository: { getPendingBetween: jest.fn(async () => []) },
    musicianProfileRepository: { getByUserId: jest.fn(async () => undefined) },
    musicianInstrumentRepository: { getByProfileId: jest.fn(async () => []) },
    instrumentRepository: {
      getExistingIds: jest.fn(async (ids) => ids.filter((id: number) => id <= 30)),
      getAll: jest.fn(async () => [
        { id: 5, name: "Drums", family: 4 },
        { id: 6, name: "Keyboard", family: 5 },
      ]),
    },
    bandMilestoneRepository: { getByBandId: jest.fn(async () => []) },
    bandMemberGenreRepository: { getByMemberIds: jest.fn(async () => []) },
    bandMemberInterestRepository: { getByMemberIds: jest.fn(async () => []) },
  };
};

const makeService = (deps: any): BandService =>
  new BandService(
    deps.dataSource,
    deps.bandRepository,
    deps.bandGenreRepository,
    deps.bandMemberRepository,
    deps.bandVideoLinkRepository,
    deps.userRepository,
    deps.genreRepository,
    deps.locationRepository,
    deps.mediaService,
    deps.bandOpenRoleRepository,
    deps.bandMembershipRequestRepository,
    deps.musicianProfileRepository,
    deps.musicianInstrumentRepository,
    deps.instrumentRepository,
    deps.bandMilestoneRepository,
    deps.bandMemberGenreRepository,
    deps.bandMemberInterestRepository,
  );

const as = <T>(userId: number, fn: () => T): T =>
  CustomRequest.run({ user_agent: "jest", ip_address: "127.0.0.1", user: { getId: () => userId } as any }, fn);

describe("BandService", () => {
  it("creates a draft with the caller as its one owner", async () => {
    const deps = makeDeps();
    deps.manager.findOneOrFail.mockResolvedValue(undefined);
    await as(OWNER_ID, () =>
      makeService(deps).saveDraftInfo({ name: "Kaalbela", genre_ids: [1, 2], location_id: 30, bio: "y".repeat(40), band_type: 2 }),
    );

    expect(deps.saved).toContainEqual(expect.objectContaining({ __entity: "BandMemberEntity", user_id: OWNER_ID, role: BandMemberRole.OWNER }));
    expect(deps.saved.flat()).toContainEqual(expect.objectContaining({ __entity: "BandGenreEntity", genre_id: 2 }));
  });

  it("answers 404 to anyone but the owner, and writes nothing", async () => {
    const deps = makeDeps();

    await expect(as(8, () => makeService(deps).addMember(3, { name: "X", position: "Y" }))).rejects.toBeInstanceOf(NotFoundException);
    await expect(as(8, () => makeService(deps).publish(3))).rejects.toBeInstanceOf(NotFoundException);
    expect(deps.dataSource.transaction).not.toHaveBeenCalled();
  });

  it("needs either a SoundCircle user or a name, and a role for someone outside SoundCircle", async () => {
    const service = makeService(makeDeps());

    await expect(as(OWNER_ID, () => service.addMember(3, {}))).rejects.toBeInstanceOf(BadRequestException);
    await expect(as(OWNER_ID, () => service.addMember(3, { user_id: 8, name: "Imran" }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(as(OWNER_ID, () => service.addMember(3, { name: "Rafiq" }))).rejects.toThrow("role or instrument");
    await expect(as(OWNER_ID, () => service.addMember(3, { user_id: 999 }))).rejects.toThrow("not found");
  });

  it("adds an outside member with a verified photo", async () => {
    const deps = makeDeps();
    await as(OWNER_ID, () =>
      makeService(deps).addMember(3, { name: "Rafiq", position: "Drums", photo_public_id: "soundcircle/bands/3/members/new" }),
    );

    expect(deps.mediaService.verifyImage).toHaveBeenCalledWith({ owner: 2, id: 3, folder: "members" }, "soundcircle/bands/3/members/new");
    expect(deps.saved).toContainEqual(
      expect.objectContaining({
        __entity: "BandMemberEntity",
        user_id: null,
        name: "Rafiq",
        position: "Drums",
        photo_url: expect.stringContaining("/members/new"),
      }),
    );
  });

  it("turns the same person twice into 409, and destroys nothing it did not upload", async () => {
    const deps = makeDeps();
    deps.manager.save.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "23505" }));

    await expect(as(OWNER_ID, () => makeService(deps).addMember(3, { user_id: 8 }))).rejects.toBeInstanceOf(ConflictException);
    expect(deps.mediaService.destroyImage).not.toHaveBeenCalled();
  });

  it("never removes the owner; removes a member and their photo", async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await expect(as(OWNER_ID, () => service.removeMember(3, 10))).rejects.toThrow("owner");
    await as(OWNER_ID, () => service.removeMember(3, 11));
    expect(deps.manager.softRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 11 }));
    expect(deps.mediaService.destroyImage).toHaveBeenCalledWith("soundcircle/bands/3/members/abc");
  });

  it("publishes once, with a slug from the name and id", async () => {
    const deps = makeDeps();
    await as(OWNER_ID, () => makeService(deps).publish(3));

    expect(deps.bandRow.slug).toBe("the-monsoon-collective-3");
    expect(deps.bandRow.published_at).toBeInstanceOf(Date);

    const first = deps.bandRow.published_at;
    await as(OWNER_ID, () => makeService(deps).publish(3));
    expect(deps.bandRow.published_at).toBe(first);
  });

  it("searches only from 2 characters", async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await expect(as(OWNER_ID, () => service.searchCandidates(3, "i"))).resolves.toEqual([]);
    expect(deps.bandMemberRepository.searchCandidates).not.toHaveBeenCalled();
    await expect(as(OWNER_ID, () => service.searchCandidates(3, "im"))).resolves.toHaveLength(1);
  });

  it("opens a position, but never a second one for the same instrument", async () => {
    const deps = makeDeps();
    await as(OWNER_ID, () => makeService(deps).addOpenRole(3, { instrument_id: 5, description: "  Weekly jams  " }));
    expect(deps.saved).toContainEqual(
      expect.objectContaining({ __entity: "BandOpenRoleEntity", band_id: 3, instrument_id: 5, description: "Weekly jams" }),
    );

    deps.manager.find.mockResolvedValueOnce([{ id: 1, band_id: 3, instrument_id: 5, status: 1 }]);
    await expect(as(OWNER_ID, () => makeService(deps).addOpenRole(3, { instrument_id: 5 }))).rejects.toBeInstanceOf(ConflictException);
  });

  it("lets only the owner open a position", async () => {
    const deps = makeDeps();
    await expect(as(8, () => makeService(deps).addOpenRole(3, { instrument_id: 5 }))).rejects.toBeInstanceOf(NotFoundException);
    expect(deps.saved).toHaveLength(0);
  });

  it("offers a viewer only the open positions their instruments can fill", async () => {
    const deps = makeDeps();
    deps.bandRepository.getPublishedBySlug = jest.fn(async () => ({ ...BAND, slug: "x-3", published_at: new Date() }));
    deps.bandOpenRoleRepository.getOpenByBandId.mockResolvedValue([
      { id: 21, instrument_id: 5, instrument_name: "Drums", description: null },
      { id: 22, instrument_id: 4, instrument_name: "Bass guitar", description: null },
    ]);
    deps.musicianProfileRepository.getByUserId.mockResolvedValue({ id: 40 });
    deps.musicianInstrumentRepository.getByProfileId.mockResolvedValue([{ instrument_id: 5 }]);

    const band = await as(8, () => makeService(deps).getPublished("x-3"));
    expect(band.viewer).toEqual({
      signed_in: true,
      is_member: false,
      pending_request: null,
      fillable_role_ids: [21],
      member_id: null,
      needs_welcome: false,
    });

    const visitor = await CustomRequest.run({ user_agent: "jest", ip_address: "127.0.0.1", user: null }, () => makeService(deps).getPublished("x-3"));
    expect(visitor.viewer.signed_in).toBe(false);
    expect(visitor.viewer.fillable_role_ids).toEqual([]);
  });

  it("records a hand-added member's instrument from their role and unlocks the first milestone", async () => {
    const deps = makeDeps();
    deps.manager.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    await as(OWNER_ID, () => makeService(deps).addMember(3, { name: "Rafiq", position: "Keys" }));

    expect(deps.saved).toContainEqual(expect.objectContaining({ __entity: "BandMemberEntity", name: "Rafiq", instrument_id: 6 }));
    const milestones = deps.saved.find((row: any) => Array.isArray(row));
    expect(milestones.map((row: any) => row.milestone)).toEqual([1, 2]);
  });

  it("welcomes only the member themselves, and keeps the first time", async () => {
    const deps = makeDeps();
    const mine: any = { id: 12, band_id: 3, user_id: 8, role: BandMemberRole.MEMBER, welcomed_at: null };
    deps.manager.findOne.mockImplementation(async (_entity, { where }) => (where.user_id === 8 ? mine : null));

    await as(8, () => makeService(deps).markWelcomed(3));
    expect(mine.welcomed_at).toBeInstanceOf(Date);
    const first = mine.welcomed_at;
    await as(8, () => makeService(deps).markWelcomed(3));
    expect(mine.welcomed_at).toBe(first);

    await expect(as(99, () => makeService(deps).markWelcomed(3))).rejects.toBeInstanceOf(NotFoundException);
  });

  it("saves an introduction, refusing unknown genres", async () => {
    const deps = makeDeps();
    const mine: any = { id: 12, band_id: 3, user_id: 8, role: BandMemberRole.MEMBER, welcomed_at: null };
    deps.manager.findOne.mockImplementation(async () => mine);

    await as(8, () => makeService(deps).saveIntroduction(3, { intro: "  Hi all  ", genre_ids: [1], interests: [4] }));
    expect(mine).toEqual(expect.objectContaining({ intro: "Hi all", introduced_at: expect.any(Date), welcomed_at: expect.any(Date) }));
    expect(deps.saved).toContainEqual([expect.objectContaining({ __entity: "BandMemberGenreEntity", band_member_id: 12, genre_id: 1 })]);
    expect(deps.saved).toContainEqual([expect.objectContaining({ __entity: "BandMemberInterestEntity", interest: 4 })]);

    deps.genreRepository.getExistingIds.mockResolvedValueOnce([]);
    await expect(as(8, () => makeService(deps).saveIntroduction(3, { genre_ids: [999] }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it("never lets the owner leave", async () => {
    const deps = makeDeps();
    deps.manager.findOne.mockImplementation(async () => ({ id: 10, band_id: 3, user_id: OWNER_ID, role: BandMemberRole.OWNER }));
    await expect(as(OWNER_ID, () => makeService(deps).leave(3))).rejects.toBeInstanceOf(BadRequestException);
    expect(deps.manager.softRemove).not.toHaveBeenCalled();
  });
});
