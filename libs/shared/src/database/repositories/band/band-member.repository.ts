import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { BandMemberRole } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import {
  TABLE_BAND_MEMBERS,
  TABLE_INSTRUMENTS,
  TABLE_MUSICIAN_INSTRUMENTS,
  TABLE_MUSICIAN_PROFILES,
  TABLE_USERS,
} from "@soundcircle/shared/utils/util/database.table";

/** A line-up row as the band page shows it: a SoundCircle member's name and photo come from their account. */
export interface BandMemberRow {
  id: number;
  user_id: number | null;
  role: BandMemberRole;
  name: string;
  position: string | null;
  photo_url: string | null;
  /**
   * What they play: the membership's own instrument, else (for a SoundCircle user) the best instrument on
   * their profile, so an owner who never named a position still counts in the lineup.
   */
  instrument_id: number | null;
  /** When they joined: the membership row's creation. */
  joined_at: Date;
  /** Their public profile, for a SoundCircle user. */
  profile_slug: string | null;
  welcomed_at: Date | null;
  intro: string | null;
  introduced_at: Date | null;
}

/** A SoundCircle user found by the member search. */
export interface MemberCandidateRow {
  id: number;
  name: string;
  photo_url: string | null;
  /** Their instruments, best first: "Vocals, Acoustic guitar". */
  instruments: string | null;
}

/** `%` and `_` in what the user typed are literal characters, not wildcards. */
const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (character) => `\\${character}`);

@Injectable()
export class BandMemberRepository extends Repository<BandMemberEntity> {
  constructor(@InjectRepository(BandMemberEntity) repository: Repository<BandMemberEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /** The line-up, owner first, then in the order they were added. */
  async getByBandId(bandId: number): Promise<BandMemberRow[]> {
    return this.createQueryBuilder("band_members")
      .select([
        "band_members.id as id",
        "band_members.user_id as user_id",
        "band_members.role as role",
        "COALESCE(band_members.name, users.name) as name",
        "band_members.position as position",
        "COALESCE(band_members.photo_url, profiles.photo_url) as photo_url",
        `COALESCE(band_members.instrument_id, (SELECT played.instrument_id FROM ${TABLE_MUSICIAN_INSTRUMENTS} played
            WHERE played.musician_profile_id = profiles.id AND played.deleted_at IS NULL
            ORDER BY played.skill_level DESC, played.id LIMIT 1)) as instrument_id`,
        "band_members.created_at as joined_at",
        "profiles.slug as profile_slug",
        "band_members.welcomed_at as welcomed_at",
        "band_members.intro as intro",
        "band_members.introduced_at as introduced_at",
      ])
      .leftJoin(TABLE_USERS, "users", "users.id = band_members.user_id")
      .leftJoin(TABLE_MUSICIAN_PROFILES, "profiles", "profiles.user_id = band_members.user_id AND profiles.deleted_at IS NULL")
      .where("band_members.band_id = :bandId", { bandId })
      .andWhere("band_members.deleted_at IS NULL")
      .orderBy("band_members.role", "ASC")
      .addOrderBy("band_members.id", "ASC")
      .getRawMany();
  }

  /** Users whose name matches, who are not already in the band. Name and photo only: both are public on a profile. */
  async searchCandidates(bandId: number, query: string, limit: number): Promise<MemberCandidateRow[]> {
    return (
      this.manager
        .createQueryBuilder()
        .select([
          "users.id as id",
          "users.name as name",
          "profiles.photo_url as photo_url",
          `(SELECT string_agg(instruments.name, ', ' ORDER BY played.skill_level DESC, instruments.name)
            FROM ${TABLE_MUSICIAN_INSTRUMENTS} played
            JOIN ${TABLE_INSTRUMENTS} instruments ON instruments.id = played.instrument_id
           WHERE played.musician_profile_id = profiles.id AND played.deleted_at IS NULL) as instruments`,
        ])
        .from(TABLE_USERS, "users")
        .leftJoin(TABLE_MUSICIAN_PROFILES, "profiles", "profiles.user_id = users.id AND profiles.deleted_at IS NULL")
        .where("users.deleted_at IS NULL")
        .andWhere("users.name ILIKE :pattern ESCAPE '\\'", { pattern: `%${escapeLike(query)}%` })
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM ${TABLE_BAND_MEMBERS} existing WHERE existing.band_id = :bandId AND existing.user_id = users.id AND existing.deleted_at IS NULL)`,
          { bandId },
        )
        // Names that start with the query first, then the rest alphabetically.
        .orderBy("CASE WHEN users.name ILIKE :prefix ESCAPE '\\' THEN 0 ELSE 1 END", "ASC")
        .setParameter("prefix", `${escapeLike(query)}%`)
        .addOrderBy("users.name", "ASC")
        .limit(limit)
        .getRawMany()
    );
  }
}
