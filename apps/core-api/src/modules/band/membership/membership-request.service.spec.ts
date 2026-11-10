import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import {
  BandMemberRole,
  MembershipRequestStatus,
  MembershipRequestType,
  OpenRoleStatus,
} from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { CustomRequest } from "@soundcircle/shared/utils/util/utils";
import { MembershipRequestService } from "@apps/core-api/modules/band/membership/membership-request.service";

const OWNER = 7;
const MUSICIAN = 8;
const STRANGER = 9;
const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

const ROW = {
  id: 50,
  type: MembershipRequestType.INVITATION,
  status: MembershipRequestStatus.PENDING,
  message: null,
  created_at: new Date(),
  responded_at: null,
  expires_at: FUTURE,
  open_role_id: 21,
  instrument_id: 5,
  instrument_name: "Drums",
  band_id: 3,
  band_name: "Neon Monsoon",
  band_slug: "neon-monsoon-3",
  band_logo_url: null,
  user_id: MUSICIAN,
  user_name: "Rafi",
  user_slug: "rafi-8",
  user_photo_url: null,
};

/** Band 3 owned by user 7; one open Drums role; a fake transaction manager that records writes. */
const makeDeps = (request: any = { ...ROW }): any => {
  const saved: any[] = [];
  const members: any[] = [{ band_id: 3, user_id: OWNER, role: BandMemberRole.OWNER }];
  const role: any = { id: 21, band_id: 3, instrument_id: 5, status: OpenRoleStatus.OPEN };
  const isOwnerWhere = (where: any): boolean =>
    members.some((m) => m.band_id === where.band_id && m.user_id === where.user_id && (!where.role || m.role === where.role));

  const manager = {
    findOne: jest.fn(async (entity: any, { where }: any) => {
      if (entity.name === "BandMembershipRequestEntity") return where.id === request.id ? request : null;
      if (entity.name === "BandEntity") return { id: 3 };
      if (entity.name === "BandMemberEntity") return members.find((m) => m.band_id === where.band_id && m.user_id === where.user_id) ?? null;
      if (entity.name === "BandOpenRoleEntity") return role;
      if (entity.name === "InstrumentEntity") return { id: 5, name: "Drums" };
      return null;
    }),
    findOneOrFail: jest.fn(async () => ({ id: 3 })),
    find: jest.fn(async () => []),
    count: jest.fn(async (entity: any, { where }: any) => (where.role || where.user_id ? (isOwnerWhere(where) ? 1 : 0) : members.length)),
    create: jest.fn((entity: any, row: any) => ({ __entity: entity.name, ...row })),
    save: jest.fn(async (row: any) => {
      saved.push({ ...row });
      if (row.__entity === "BandMemberEntity") members.push(row);
      if (!row.id) row.id = 77;
      return row;
    }),
  };

  return {
    saved,
    members,
    role,
    request,
    manager,
    dataSource: { transaction: jest.fn(async (work: any) => work(manager)) },
    bandRepository: {
      getOne: jest.fn(async (id: number) => (id === 3 ? { id: 3, published_at: new Date() } : undefined)),
      getByMember: jest.fn(async () => []),
    },
    bandMemberRepository: { count: jest.fn(async ({ where }: any) => (isOwnerWhere(where) ? 1 : 0)) },
    bandOpenRoleRepository: { getOpenByBandId: jest.fn(async () => [{ id: 21, instrument_id: 5, instrument_name: "Drums", description: null }]) },
    bandMembershipRequestRepository: { getOne: jest.fn(async () => ({ ...ROW, ...request })), getPendingBetween: jest.fn(async () => []) },
    userRepository: { getOne: jest.fn(async (id: number) => ({ id })) },
    musicianProfileRepository: { getByUserId: jest.fn(async () => ({ id: 40 })) },
    musicianInstrumentRepository: { getByProfileId: jest.fn(async () => [{ instrument_id: 5 }]) },
    instrumentRepository: { getExistingIds: jest.fn(async (ids: number[]) => ids) },
  };
};

const makeService = (deps: any): MembershipRequestService =>
  new MembershipRequestService(
    deps.dataSource,
    deps.bandRepository,
    deps.bandMemberRepository,
    deps.bandOpenRoleRepository,
    deps.bandMembershipRequestRepository,
    deps.userRepository,
    deps.musicianProfileRepository,
    deps.musicianInstrumentRepository,
    deps.instrumentRepository,
  );

const as = <T>(userId: number, fn: () => T): T =>
  CustomRequest.run({ user_agent: "jest", ip_address: "127.0.0.1", user: { getId: () => userId } as any }, fn);

describe("MembershipRequestService", () => {
  describe("accept", () => {
    it("adds the invited musician to the band and fills the open position", async () => {
      const deps = makeDeps();
      await as(MUSICIAN, () => makeService(deps).accept(50));

      expect(deps.saved).toContainEqual(
        expect.objectContaining({ __entity: "BandMemberEntity", band_id: 3, user_id: MUSICIAN, role: BandMemberRole.MEMBER, position: "Drums" }),
      );
      expect(deps.role).toEqual(expect.objectContaining({ status: OpenRoleStatus.FILLED, filled_by_user_id: MUSICIAN }));
      expect(deps.request).toEqual(expect.objectContaining({ status: MembershipRequestStatus.ACCEPTED, responded_by_user_id: MUSICIAN }));
    });

    it("lets the owner, not the musician, accept a join request", async () => {
      const join = { ...ROW, type: MembershipRequestType.JOIN_REQUEST };
      await expect(as(MUSICIAN, () => makeService(makeDeps({ ...join })).accept(50))).rejects.toBeInstanceOf(NotFoundException);

      const deps = makeDeps({ ...join });
      await as(OWNER, () => makeService(deps).accept(50));
      expect(deps.members.some((m: any) => m.user_id === MUSICIAN)).toBe(true);
    });

    it("never lets the sender or a stranger accept an invitation", async () => {
      for (const actor of [OWNER, STRANGER]) {
        const deps = makeDeps();
        await expect(as(actor, () => makeService(deps).accept(50))).rejects.toBeInstanceOf(NotFoundException);
        expect(deps.saved).toHaveLength(0);
      }
    });

    it("refuses a second answer with 409", async () => {
      const deps = makeDeps({ ...ROW, status: MembershipRequestStatus.ACCEPTED });
      await expect(as(MUSICIAN, () => makeService(deps).accept(50))).rejects.toBeInstanceOf(ConflictException);
      expect(deps.saved).toHaveLength(0);
    });

    it("refuses an expired request", async () => {
      const deps = makeDeps({ ...ROW, expires_at: PAST });
      await expect(as(MUSICIAN, () => makeService(deps).accept(50))).rejects.toBeInstanceOf(ConflictException);
      expect(deps.members).toHaveLength(1);
    });
  });

  it("declining adds nobody", async () => {
    const deps = makeDeps();
    await as(MUSICIAN, () => makeService(deps).decline(50));
    expect(deps.request.status).toBe(MembershipRequestStatus.DECLINED);
    expect(deps.members).toHaveLength(1);
  });

  it("lets only the sender withdraw", async () => {
    await expect(as(MUSICIAN, () => makeService(makeDeps()).cancel(50))).rejects.toBeInstanceOf(NotFoundException);
    const deps = makeDeps();
    await as(OWNER, () => makeService(deps).cancel(50));
    expect(deps.request.status).toBe(MembershipRequestStatus.CANCELLED);
  });

  describe("requestToJoin", () => {
    it("refuses a position for an instrument the musician doesn't play", async () => {
      const deps = makeDeps();
      deps.musicianInstrumentRepository.getByProfileId.mockResolvedValue([{ instrument_id: 1 }]);
      await expect(as(MUSICIAN, () => makeService(deps).requestToJoin({ band_id: 3, open_role_id: 21 }))).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.saved).toHaveLength(0);
    });

    it("refuses a closed or unknown position", async () => {
      const deps = makeDeps();
      await expect(as(MUSICIAN, () => makeService(deps).requestToJoin({ band_id: 3, open_role_id: 99 }))).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a member", async () => {
      const deps = makeDeps();
      await expect(as(OWNER, () => makeService(deps).requestToJoin({ band_id: 3, open_role_id: 21 }))).rejects.toBeInstanceOf(ConflictException);
    });

    it("sends a pending request tied to the role and its instrument", async () => {
      const deps = makeDeps();
      await as(MUSICIAN, () => makeService(deps).requestToJoin({ band_id: 3, open_role_id: 21, message: "  hi  " }));
      expect(deps.saved).toContainEqual(
        expect.objectContaining({
          __entity: "BandMembershipRequestEntity",
          type: MembershipRequestType.JOIN_REQUEST,
          user_id: MUSICIAN,
          open_role_id: 21,
          instrument_id: 5,
          message: "hi",
          status: MembershipRequestStatus.PENDING,
        }),
      );
    });

    it("refuses while an invitation from the band is pending, but replaces a lapsed one", async () => {
      const live = makeDeps();
      live.manager.find.mockResolvedValueOnce([{ id: 60, type: MembershipRequestType.INVITATION, status: 1, expires_at: FUTURE }]);
      await expect(as(MUSICIAN, () => makeService(live).requestToJoin({ band_id: 3, open_role_id: 21 }))).rejects.toBeInstanceOf(ConflictException);

      const lapsed = makeDeps();
      lapsed.manager.find.mockResolvedValueOnce([{ id: 60, type: MembershipRequestType.INVITATION, status: 1, expires_at: PAST }]);
      await as(MUSICIAN, () => makeService(lapsed).requestToJoin({ band_id: 3, open_role_id: 21 }));
      expect(lapsed.saved[0]).toEqual(expect.objectContaining({ id: 60, status: MembershipRequestStatus.EXPIRED }));
      expect(lapsed.saved[1]).toEqual(expect.objectContaining({ __entity: "BandMembershipRequestEntity", status: MembershipRequestStatus.PENDING }));
    });
  });

  describe("invite", () => {
    it("is the band owner's only", async () => {
      const deps = makeDeps();
      await expect(as(STRANGER, () => makeService(deps).invite({ band_id: 3, user_id: MUSICIAN }))).rejects.toBeInstanceOf(NotFoundException);
    });

    it("ties an invitation for an open position's instrument to that position", async () => {
      const deps = makeDeps();
      await as(OWNER, () => makeService(deps).invite({ band_id: 3, user_id: MUSICIAN, instrument_id: 5 }));
      expect(deps.saved).toContainEqual(
        expect.objectContaining({ type: MembershipRequestType.INVITATION, open_role_id: 21, sent_by_user_id: OWNER }),
      );
    });

    it("refuses a musician already in the band", async () => {
      const deps = makeDeps();
      deps.members.push({ band_id: 3, user_id: MUSICIAN, role: BandMemberRole.MEMBER });
      await expect(as(OWNER, () => makeService(deps).invite({ band_id: 3, user_id: MUSICIAN }))).rejects.toBeInstanceOf(ConflictException);
    });

    it("refuses an unpublished band", async () => {
      const deps = makeDeps();
      deps.bandRepository.getOne.mockResolvedValue({ id: 3, published_at: null });
      await expect(as(OWNER, () => makeService(deps).invite({ band_id: 3, user_id: MUSICIAN }))).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
