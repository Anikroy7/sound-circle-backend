import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { BandMembershipRequestEntity } from "@soundcircle/shared/database/entities/band/band-membership-request.entity";
import { BandMemberRole, MembershipRequestStatus, MembershipRequestType } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import {
  TABLE_BAND_MEMBERS,
  TABLE_BANDS,
  TABLE_INSTRUMENTS,
  TABLE_MUSICIAN_PROFILES,
  TABLE_USERS,
} from "@soundcircle/shared/utils/util/database.table";

/** A request with the band, the musician and the role it is about, flattened for the service to shape. */
export interface MembershipRequestRow {
  id: number;
  type: MembershipRequestType;
  /** ⚠ Effective status: a pending row past `expires_at` reads as `EXPIRED` though nothing has rewritten it. */
  status: MembershipRequestStatus;
  message: string | null;
  created_at: Date;
  responded_at: Date | null;
  expires_at: Date;
  open_role_id: number | null;
  instrument_id: number | null;
  instrument_name: string | null;
  band_id: number;
  band_name: string;
  band_slug: string | null;
  band_logo_url: string | null;
  user_id: number;
  user_name: string;
  user_slug: string | null;
  user_photo_url: string | null;
}

/** How many sent requests a dashboard list shows, newest first. */
const SENT_LIMIT = 20;

const OWNS_BAND_SQL = `EXISTS (SELECT 1 FROM ${TABLE_BAND_MEMBERS} owner
  WHERE owner.band_id = requests.band_id AND owner.user_id = :me AND owner.role = :ownerRole AND owner.deleted_at IS NULL)`;

@Injectable()
export class BandMembershipRequestRepository extends Repository<BandMembershipRequestEntity> {
  constructor(@InjectRepository(BandMembershipRequestEntity) repository: Repository<BandMembershipRequestEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async getOne(id: number): Promise<MembershipRequestRow | undefined> {
    return this.rows().andWhere("requests.id = :id", { id }).getRawOne();
  }

  /** Invitations sent to the musician that still wait on an answer. */
  async getPendingInvitationsFor(userId: number): Promise<MembershipRequestRow[]> {
    return this.pending(this.rows())
      .andWhere("requests.type = :type AND requests.user_id = :userId", { type: MembershipRequestType.INVITATION, userId })
      .orderBy("requests.created_at", "DESC")
      .getRawMany();
  }

  /** Join requests to bands the user owns that still wait on an answer. */
  async getPendingJoinRequestsForOwner(userId: number): Promise<MembershipRequestRow[]> {
    return this.pending(this.rows())
      .andWhere("requests.type = :type", { type: MembershipRequestType.JOIN_REQUEST })
      .andWhere(OWNS_BAND_SQL, { me: userId, ownerRole: BandMemberRole.OWNER })
      .orderBy("requests.created_at", "DESC")
      .getRawMany();
  }

  /** The musician's own join requests, any status, newest first. */
  async getJoinRequestsSentBy(userId: number): Promise<MembershipRequestRow[]> {
    return this.rows()
      .andWhere("requests.type = :type AND requests.user_id = :userId", { type: MembershipRequestType.JOIN_REQUEST, userId })
      .orderBy("requests.created_at", "DESC")
      .limit(SENT_LIMIT)
      .getRawMany();
  }

  /** Invitations from bands the user owns, any status, newest first. */
  async getInvitationsSentByOwner(userId: number): Promise<MembershipRequestRow[]> {
    return this.rows()
      .andWhere("requests.type = :type", { type: MembershipRequestType.INVITATION })
      .andWhere(OWNS_BAND_SQL, { me: userId, ownerRole: BandMemberRole.OWNER })
      .orderBy("requests.created_at", "DESC")
      .limit(SENT_LIMIT)
      .getRawMany();
  }

  /** One band's requests of a kind, newest first: what its dashboard lists. `pendingOnly` for a queue to answer. */
  async getForBand(bandId: number, type: MembershipRequestType, pendingOnly: boolean): Promise<MembershipRequestRow[]> {
    const builder = this.rows().andWhere("requests.band_id = :bandId AND requests.type = :type", { bandId, type });
    return (pendingOnly ? this.pending(builder) : builder).orderBy("requests.created_at", "DESC").limit(SENT_LIMIT).getRawMany();
  }

  /** The live (pending, not expired) request between a musician and any of these bands. */
  async getPendingBetween(bandIds: number[], userId: number): Promise<MembershipRequestRow[]> {
    if (!bandIds.length) return [];
    return this.pending(this.rows()).andWhere("requests.band_id IN (:...bandIds) AND requests.user_id = :userId", { bandIds, userId }).getRawMany();
  }

  private rows(): SelectQueryBuilder<BandMembershipRequestEntity> {
    return this.createQueryBuilder("requests")
      .select([
        "requests.id as id",
        "requests.type as type",
        "CASE WHEN requests.status = :pending AND requests.expires_at < now() THEN :expired ELSE requests.status END as status",
        "requests.message as message",
        "requests.created_at as created_at",
        "requests.responded_at as responded_at",
        "requests.expires_at as expires_at",
        "requests.open_role_id as open_role_id",
        "requests.instrument_id as instrument_id",
        "instruments.name as instrument_name",
        "bands.id as band_id",
        "bands.name as band_name",
        "bands.slug as band_slug",
        "bands.logo_url as band_logo_url",
        "users.id as user_id",
        "users.name as user_name",
        "profiles.slug as user_slug",
        "profiles.photo_url as user_photo_url",
      ])
      .innerJoin(TABLE_BANDS, "bands", "bands.id = requests.band_id AND bands.deleted_at IS NULL")
      .innerJoin(TABLE_USERS, "users", "users.id = requests.user_id AND users.deleted_at IS NULL")
      .leftJoin(TABLE_MUSICIAN_PROFILES, "profiles", "profiles.user_id = requests.user_id AND profiles.deleted_at IS NULL")
      .leftJoin(TABLE_INSTRUMENTS, "instruments", "instruments.id = requests.instrument_id")
      .where("requests.deleted_at IS NULL")
      .setParameters({ pending: MembershipRequestStatus.PENDING, expired: MembershipRequestStatus.EXPIRED });
  }

  private pending(builder: SelectQueryBuilder<BandMembershipRequestEntity>): SelectQueryBuilder<BandMembershipRequestEntity> {
    return builder.andWhere("requests.status = :pending AND requests.expires_at >= now()");
  }
}
