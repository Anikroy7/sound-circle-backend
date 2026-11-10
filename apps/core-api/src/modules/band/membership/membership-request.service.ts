import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { BandMembershipRequestEntity } from "@soundcircle/shared/database/entities/band/band-membership-request.entity";
import { BandOpenRoleEntity } from "@soundcircle/shared/database/entities/band/band-open-role.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import {
  BandMemberRole,
  MembershipRequestStatus,
  MembershipRequestType,
  OpenRoleStatus,
} from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { BandMemberRepository } from "@soundcircle/shared/database/repositories/band/band-member.repository";
import {
  BandMembershipRequestRepository,
  MembershipRequestRow,
} from "@soundcircle/shared/database/repositories/band/band-membership-request.repository";
import { BandOpenRoleRepository } from "@soundcircle/shared/database/repositories/band/band-open-role.repository";
import { BandRepository } from "@soundcircle/shared/database/repositories/band/band.repository";
import { UserRepository } from "@soundcircle/shared/database/repositories/identity/user.repository";
import { MusicianInstrumentRepository } from "@soundcircle/shared/database/repositories/musician/musician-instrument.repository";
import { MusicianProfileRepository } from "@soundcircle/shared/database/repositories/musician/musician-profile.repository";
import { InstrumentRepository } from "@soundcircle/shared/database/repositories/reference/instrument.repository";
import { MAX_BAND_MEMBERS, MEMBERSHIP_REQUEST_TTL_DAYS, PG_UNIQUE_VIOLATION } from "@soundcircle/shared/utils/util/constant";
import { AuthUser } from "@soundcircle/shared/utils/util/utils";
import { InviteOptionView, MembershipInboxView, MembershipRequestView } from "@apps/core-api/modules/band/common/types/band.type";
import { CreateInvitationDto, CreateJoinRequestDto } from "@apps/core-api/modules/band/membership/dto/membership-request.dto";
import { unlockMilestones } from "@apps/core-api/modules/band/common/utils/band-chemistry.util";

/** What a respondent or sender can do to a pending request. */
type Answer = "accept" | "decline" | "cancel";

const ANSWERED: Record<Answer, MembershipRequestStatus> = {
  accept: MembershipRequestStatus.ACCEPTED,
  decline: MembershipRequestStatus.DECLINED,
  cancel: MembershipRequestStatus.CANCELLED,
};

const ALREADY: Partial<Record<MembershipRequestStatus, string>> = {
  [MembershipRequestStatus.ACCEPTED]: "This request was already accepted",
  [MembershipRequestStatus.DECLINED]: "This request was already declined",
  [MembershipRequestStatus.CANCELLED]: "This request was withdrawn",
  [MembershipRequestStatus.EXPIRED]: "This request has expired",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Joining a band (schema-design §4.5): an owner's invitation to a musician, or a musician's request to
 * fill an open position. The musician answers an invitation; the band owner answers a join request; the
 * sender may withdraw either. Accepting adds the musician to the line-up and fills the open position,
 * all in one transaction behind a lock on the request row, so a second answer gets 409.
 */
@Injectable()
export class MembershipRequestService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bandRepository: BandRepository,
    private readonly bandMemberRepository: BandMemberRepository,
    private readonly bandOpenRoleRepository: BandOpenRoleRepository,
    private readonly bandMembershipRequestRepository: BandMembershipRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly musicianProfileRepository: MusicianProfileRepository,
    private readonly musicianInstrumentRepository: MusicianInstrumentRepository,
    private readonly instrumentRepository: InstrumentRepository,
  ) {}

  /* ------------------------------------------------------------------ reads */

  /** My dashboard: what waits on my answer, and what I've sent. */
  async getInbox(): Promise<MembershipInboxView> {
    const me = this.userId();
    const [invitationsReceived, joinRequestsReceived, invitationsSent, joinRequestsSent] = await Promise.all([
      this.bandMembershipRequestRepository.getPendingInvitationsFor(me),
      this.bandMembershipRequestRepository.getPendingJoinRequestsForOwner(me),
      this.bandMembershipRequestRepository.getInvitationsSentByOwner(me),
      this.bandMembershipRequestRepository.getJoinRequestsSentBy(me),
    ]);
    return {
      invitations_received: invitationsReceived.map(requestView),
      join_requests_received: joinRequestsReceived.map(requestView),
      invitations_sent: invitationsSent.map(requestView),
      join_requests_sent: joinRequestsSent.map(requestView),
    };
  }

  /** My published bands, each with where it stands with this musician — what the profile's Invite offers. */
  async getInviteOptions(userId: number): Promise<InviteOptionView[]> {
    const me = this.userId();
    const owned = (await this.bandRepository.getByMember(me)).filter((band) => Number(band.role) === BandMemberRole.OWNER && band.published_at);
    if (!owned.length || userId === me) return [];

    const bandIds = owned.map((band) => band.id);
    const [theirBands, pending, roles] = await Promise.all([
      this.bandRepository.getByMember(userId),
      this.bandMembershipRequestRepository.getPendingBetween(bandIds, userId),
      Promise.all(bandIds.map((id) => this.bandOpenRoleRepository.getOpenByBandId(id))),
    ]);

    return owned.map((band, index) => {
      const request = pending.find((row) => row.band_id === band.id);
      const isMember = theirBands.some((row) => row.id === band.id);
      return {
        band: { id: band.id, name: band.name, slug: band.slug, logo_url: band.logo_url ?? null },
        status: isMember ? "member" : request ? (Number(request.type) === MembershipRequestType.INVITATION ? "invited" : "requested") : null,
        request: request ? requestView(request) : null,
        open_roles: roles[index].map((role) => ({
          id: role.id,
          instrument_id: role.instrument_id,
          instrument_name: role.instrument_name,
          description: role.description ?? null,
        })),
      };
    });
  }

  /* ------------------------------------------------------------------ send */

  /** The owner of a published band invites a musician. An instrument matching an open position ties the invitation to it. */
  async invite(reqDto: CreateInvitationDto): Promise<MembershipRequestView> {
    const me = this.userId();
    const band = await this.bandRepository.getOne(reqDto.band_id);
    if (!band || !(await this.isOwner(band.id, me))) throw new NotFoundException("That band was not found");
    if (!band.published_at) throw new BadRequestException("Publish your band before inviting musicians");
    if (reqDto.user_id === me) throw new BadRequestException("You're already in this band");
    if (!(await this.userRepository.getOne(reqDto.user_id))) throw new NotFoundException("That musician was not found");
    if (await this.isMember(band.id, reqDto.user_id)) throw new ConflictException("They're already in the band");

    let openRoleId: number | null = null;
    if (reqDto.instrument_id) {
      if (!(await this.instrumentRepository.getExistingIds([reqDto.instrument_id])).length)
        throw new BadRequestException("Choose an instrument from the list");
      openRoleId =
        (await this.bandOpenRoleRepository.getOpenByBandId(band.id)).find((role) => role.instrument_id === reqDto.instrument_id)?.id ?? null;
    }

    return this.send({
      band_id: band.id,
      user_id: reqDto.user_id,
      type: MembershipRequestType.INVITATION,
      open_role_id: openRoleId,
      instrument_id: reqDto.instrument_id ?? null,
      message: reqDto.message?.trim() || null,
      sent_by_user_id: me,
    });
  }

  /** A musician asks to fill an open position — only one for an instrument on their profile. */
  async requestToJoin(reqDto: CreateJoinRequestDto): Promise<MembershipRequestView> {
    const me = this.userId();
    const band = await this.bandRepository.getOne(reqDto.band_id);
    if (!band || !band.published_at) throw new NotFoundException("That band was not found");
    if (await this.isMember(band.id, me)) throw new ConflictException("You're already in this band");

    const role = (await this.bandOpenRoleRepository.getOpenByBandId(band.id)).find((row) => row.id === reqDto.open_role_id);
    if (!role) throw new BadRequestException("That position is no longer open");

    const profile = await this.musicianProfileRepository.getByUserId(me);
    const played = profile ? (await this.musicianInstrumentRepository.getByProfileId(profile.id)).map((row) => row.instrument_id) : [];
    if (!played.includes(role.instrument_id)) {
      throw new BadRequestException(`This position is for ${role.instrument_name}. Add it to your profile's instruments to apply`);
    }

    return this.send({
      band_id: band.id,
      user_id: me,
      type: MembershipRequestType.JOIN_REQUEST,
      open_role_id: role.id,
      instrument_id: role.instrument_id,
      message: reqDto.message?.trim() || null,
      sent_by_user_id: me,
    });
  }

  /* ------------------------------------------------------------------ answer */

  /** The recipient accepts: the musician joins the band, and the open position (if any) is filled. */
  accept(id: number): Promise<MembershipRequestView> {
    return this.answer(id, "accept");
  }

  decline(id: number): Promise<MembershipRequestView> {
    return this.answer(id, "decline");
  }

  /** The sender withdraws it. */
  cancel(id: number): Promise<MembershipRequestView> {
    return this.answer(id, "cancel");
  }

  /* ------------------------------------------------------------------ internals */

  private async answer(id: number, answer: Answer): Promise<MembershipRequestView> {
    const me = this.userId();

    await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(BandMembershipRequestEntity, { where: { id }, lock: { mode: "pessimistic_write" } });
      if (!request) throw new NotFoundException("That request was not found");

      const ownsBand = await this.isOwner(request.band_id, me, manager);
      const isMusician = request.user_id === me;
      const isInvitation = Number(request.type) === MembershipRequestType.INVITATION;
      const recipient = isInvitation ? isMusician : ownsBand;
      const sender = isInvitation ? ownsBand : isMusician;
      // Someone else's request looks like no request at all.
      if (answer === "cancel" ? !sender : !recipient) throw new NotFoundException("That request was not found");

      const status = Number(request.status) as MembershipRequestStatus;
      if (status !== MembershipRequestStatus.PENDING) throw new ConflictException(ALREADY[status] ?? "This request was already answered");
      if (new Date(request.expires_at).getTime() < Date.now()) throw new ConflictException(ALREADY[MembershipRequestStatus.EXPIRED]);

      if (answer === "accept") await this.join(manager, request);

      request.status = ANSWERED[answer];
      request.responded_by_user_id = me;
      request.responded_at = new Date();
      await manager.save(request);
    });

    return requestView(await this.bandMembershipRequestRepository.getOne(id));
  }

  /** Adds the musician to the line-up (unless they were added some other way meanwhile) and fills the position. */
  private async join(manager: EntityManager, request: BandMembershipRequestEntity): Promise<void> {
    const band = await manager.findOne(BandEntity, { where: { id: request.band_id }, lock: { mode: "pessimistic_write" } });
    if (!band) throw new ConflictException("This band no longer exists");

    const already = await manager.findOne(BandMemberEntity, { where: { band_id: band.id, user_id: request.user_id } });
    if (!already) {
      const count = await manager.count(BandMemberEntity, { where: { band_id: band.id } });
      if (count >= MAX_BAND_MEMBERS) throw new BadRequestException(`A band can have up to ${MAX_BAND_MEMBERS} members`);
      const instrument = request.instrument_id ? await manager.findOne(InstrumentEntity, { where: { id: request.instrument_id } }) : null;
      await manager.save(
        manager.create(BandMemberEntity, {
          band_id: band.id,
          user_id: request.user_id,
          role: BandMemberRole.MEMBER,
          name: null,
          position: instrument?.name ?? null,
          instrument_id: instrument?.id ?? null,
        }),
      );
    }

    await unlockMilestones(manager, band.id);

    if (request.open_role_id) {
      const role = await manager.findOne(BandOpenRoleEntity, { where: { id: request.open_role_id }, lock: { mode: "pessimistic_write" } });
      if (role && Number(role.status) === OpenRoleStatus.OPEN) {
        role.status = OpenRoleStatus.FILLED;
        role.filled_by_user_id = request.user_id;
        await manager.save(role);
      }
    }
  }

  /**
   * Writes a new pending request. A pending one between the same band and musician blocks it (409); one
   * that has lapsed is marked expired first, so the partial unique index lets the new one in.
   */
  private async send(columns: Partial<BandMembershipRequestEntity>): Promise<MembershipRequestView> {
    let id: number;
    try {
      id = await this.dataSource.transaction(async (manager) => {
        await manager.findOneOrFail(BandEntity, { where: { id: columns.band_id }, lock: { mode: "pessimistic_write" } });
        const live = await manager.find(BandMembershipRequestEntity, {
          where: { band_id: columns.band_id, user_id: columns.user_id, status: MembershipRequestStatus.PENDING },
        });
        for (const row of live) {
          if (new Date(row.expires_at).getTime() >= Date.now()) throw new ConflictException(conflictMessage(columns.type, Number(row.type)));
          row.status = MembershipRequestStatus.EXPIRED;
          await manager.save(row);
        }

        const request = manager.create(BandMembershipRequestEntity, {
          ...columns,
          status: MembershipRequestStatus.PENDING,
          expires_at: new Date(Date.now() + MEMBERSHIP_REQUEST_TTL_DAYS * DAY_MS),
        });
        await manager.save(request);
        return request.id;
      });
    } catch (error: any) {
      if (error?.code === PG_UNIQUE_VIOLATION) throw new ConflictException(conflictMessage(columns.type, columns.type));
      throw error;
    }
    return requestView(await this.bandMembershipRequestRepository.getOne(id));
  }

  private userId(): number {
    const user = AuthUser.get();
    if (!user) throw new UnauthorizedException("Please log in to continue");
    return user.getId();
  }

  private async isOwner(bandId: number, userId: number, manager?: EntityManager): Promise<boolean> {
    const where = { band_id: bandId, user_id: userId, role: BandMemberRole.OWNER };
    return (manager ? await manager.count(BandMemberEntity, { where }) : await this.bandMemberRepository.count({ where })) > 0;
  }

  private async isMember(bandId: number, userId: number): Promise<boolean> {
    return (await this.bandMemberRepository.count({ where: { band_id: bandId, user_id: userId } })) > 0;
  }
}

/** Why a new request clashes with the pending one, in the sender's words. */
const conflictMessage = (sending: MembershipRequestType, pending: MembershipRequestType): string => {
  if (sending === MembershipRequestType.INVITATION) {
    return pending === MembershipRequestType.INVITATION
      ? "You've already invited them to this band"
      : "They've already asked to join this band. Answer their request on your dashboard";
  }
  return pending === MembershipRequestType.JOIN_REQUEST
    ? "You've already asked to join this band"
    : "This band has already invited you. Answer the invitation on your dashboard";
};

const iso = (value: Date | string | null): string | null => (value ? new Date(value).toISOString() : null);

export const requestView = (row: MembershipRequestRow): MembershipRequestView => ({
  id: row.id,
  type: Number(row.type),
  status: Number(row.status),
  message: row.message ?? null,
  created_at: iso(row.created_at),
  responded_at: iso(row.responded_at),
  expires_at: iso(row.expires_at),
  band: { id: row.band_id, name: row.band_name, slug: row.band_slug ?? null, logo_url: row.band_logo_url ?? null },
  musician: { user_id: row.user_id, name: row.user_name, slug: row.user_slug ?? null, photo_url: row.user_photo_url ?? null },
  role: row.instrument_id ? { open_role_id: row.open_role_id ?? null, instrument_id: row.instrument_id, name: row.instrument_name } : null,
});
