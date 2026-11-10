import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { paginateRaw, Pagination } from "nestjs-typeorm-paginate";
import { Repository, SelectQueryBuilder } from "typeorm";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandMemberRole, BandType, OpenRoleStatus } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { FilterBandDto } from "@soundcircle/shared/utils/dtos/band/filter-band.dto";
import { DEFAULT_PAGE_NO, DEFAULT_SEARCH_PAGE_SIZE } from "@soundcircle/shared/utils/util/constant";
import {
  TABLE_BAND_GENRES,
  TABLE_BAND_MEMBERS,
  TABLE_BAND_OPEN_ROLES,
  TABLE_GENRES,
  TABLE_INSTRUMENTS,
  TABLE_LOCATIONS,
} from "@soundcircle/shared/utils/util/database.table";
import { locationsOverlapSql } from "@soundcircle/shared/utils/util/location.util";
import { escapeLike } from "@soundcircle/shared/utils/util/query-param.util";

/** One band in the directory. */
export interface BandSearchRow {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  bio: string;
  band_type: BandType;
  location_id: number;
  /** "Rock, Metal". */
  genres: string | null;
  member_count: number;
  /** The open positions' instruments: "Drums, Bass guitar". */
  open_roles: string | null;
}

/** A band the user is in, for their dashboard. */
export interface MyBandRow {
  id: number;
  slug: string | null;
  name: string;
  logo_url: string | null;
  published_at: Date | null;
  role: BandMemberRole;
  member_count: number;
  open_role_count: number;
}

const MEMBER_COUNT_SQL = `(SELECT count(*)::int FROM ${TABLE_BAND_MEMBERS} line_up WHERE line_up.band_id = bands.id AND line_up.deleted_at IS NULL)`;

@Injectable()
export class BandRepository extends Repository<BandEntity> {
  constructor(@InjectRepository(BandEntity) repository: Repository<BandEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "bands.id as id",
    "bands.name as name",
    "bands.slug as slug",
    "bands.logo_url as logo_url",
    "bands.bio as bio",
    "bands.location_id as location_id",
    "bands.band_type as band_type",
    "bands.published_at as published_at",
  ];

  async getOne(id: number): Promise<BandEntity | undefined> {
    return this.createQueryBuilder("bands")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("bands.id = :id", { id })
      .andWhere("bands.deleted_at IS NULL")
      .getRawOne();
  }

  /** A published band by its URL. Drafts have no slug, so they are never found here. */
  async getPublishedBySlug(slug: string): Promise<BandEntity | undefined> {
    return this.createQueryBuilder("bands")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("bands.slug = :slug", { slug })
      .andWhere("bands.published_at IS NOT NULL")
      .andWhere("bands.deleted_at IS NULL")
      .getRawOne();
  }

  /** The user's band still being created (the newest, if several), or undefined. */
  async getDraftByOwner(userId: number): Promise<BandEntity | undefined> {
    return this.createQueryBuilder("bands")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .innerJoin(
        TABLE_BAND_MEMBERS,
        "owner",
        "owner.band_id = bands.id AND owner.role = :owner AND owner.user_id = :userId AND owner.deleted_at IS NULL",
        {
          owner: BandMemberRole.OWNER,
          userId,
        },
      )
      .where("bands.published_at IS NULL")
      .andWhere("bands.deleted_at IS NULL")
      .orderBy("bands.id", "DESC")
      .getRawOne();
  }

  /** Bands the user is a member of, owned first. Includes their own drafts, so the dashboard can resume one. */
  async getByMember(userId: number): Promise<MyBandRow[]> {
    return (
      this.createQueryBuilder("bands")
        .select([
          "bands.id as id",
          "bands.slug as slug",
          "bands.name as name",
          "bands.logo_url as logo_url",
          "bands.published_at as published_at",
          "membership.role as role",
          `${MEMBER_COUNT_SQL} as member_count`,
          `(SELECT count(*)::int FROM ${TABLE_BAND_OPEN_ROLES} roles WHERE roles.band_id = bands.id AND roles.status = :open AND roles.deleted_at IS NULL) as open_role_count`,
        ])
        .innerJoin(
          TABLE_BAND_MEMBERS,
          "membership",
          "membership.band_id = bands.id AND membership.user_id = :userId AND membership.deleted_at IS NULL",
          {
            userId,
          },
        )
        .where("bands.deleted_at IS NULL")
        // Someone else's draft is not theirs to see, even as a member.
        .andWhere("(bands.published_at IS NOT NULL OR membership.role = :owner)", { owner: BandMemberRole.OWNER })
        .setParameter("open", OpenRoleStatus.OPEN)
        .orderBy("membership.role", "ASC")
        .addOrderBy("bands.name", "ASC")
        .getRawMany()
    );
  }

  /** The band directory: published bands only. Always paginated. */
  async search(filters: FilterBandDto): Promise<Pagination<BandSearchRow>> {
    const builder = this.createQueryBuilder("bands")
      .select([
        "bands.id as id",
        "bands.slug as slug",
        "bands.name as name",
        "bands.logo_url as logo_url",
        "bands.bio as bio",
        "bands.band_type as band_type",
        "bands.location_id as location_id",
        `(SELECT string_agg(genres.name, ', ' ORDER BY genres.sort_order)
            FROM ${TABLE_BAND_GENRES} played JOIN ${TABLE_GENRES} genres ON genres.id = played.genre_id
           WHERE played.band_id = bands.id AND played.deleted_at IS NULL) as genres`,
        `${MEMBER_COUNT_SQL} as member_count`,
        `(SELECT string_agg(instruments.name, ', ' ORDER BY instruments.sort_order)
            FROM ${TABLE_BAND_OPEN_ROLES} roles JOIN ${TABLE_INSTRUMENTS} instruments ON instruments.id = roles.instrument_id
           WHERE roles.band_id = bands.id AND roles.status = :open AND roles.deleted_at IS NULL) as open_roles`,
      ])
      .where("bands.published_at IS NOT NULL")
      .andWhere("bands.deleted_at IS NULL")
      .setParameter("open", OpenRoleStatus.OPEN);

    if (filters.search) builder.andWhere("bands.name ILIKE :pattern ESCAPE '\\'", { pattern: `%${escapeLike(filters.search)}%` });

    if (filters.genre_ids?.length) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_BAND_GENRES} played WHERE played.band_id = bands.id AND played.deleted_at IS NULL AND played.genre_id IN (:...genreIds))`,
        { genreIds: filters.genre_ids },
      );
    }

    if (filters.location_id) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_LOCATIONS} practice
                   JOIN ${TABLE_LOCATIONS} wanted ON wanted.id = :locationId AND wanted.deleted_at IS NULL
                  WHERE practice.id = bands.location_id AND ${locationsOverlapSql("practice", "wanted")})`,
        { locationId: filters.location_id },
      );
    }

    if (filters.band_type) builder.andWhere("bands.band_type = :bandType", { bandType: filters.band_type });

    if (filters.hiring_instrument_ids?.length) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_BAND_OPEN_ROLES} roles
                  WHERE roles.band_id = bands.id AND roles.status = :open AND roles.deleted_at IS NULL AND roles.instrument_id IN (:...hiringIds))`,
        { hiringIds: filters.hiring_instrument_ids },
      );
    } else if (filters.hiring) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_BAND_OPEN_ROLES} roles WHERE roles.band_id = bands.id AND roles.status = :open AND roles.deleted_at IS NULL)`,
      );
    }

    if (filters.member_user_id) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_BAND_MEMBERS} line_up WHERE line_up.band_id = bands.id AND line_up.user_id = :memberUserId AND line_up.deleted_at IS NULL)`,
        { memberUserId: filters.member_user_id },
      );
    }

    if (filters.sort === "name") builder.orderBy("bands.name", "ASC");
    else builder.orderBy("bands.published_at", "DESC");
    builder.addOrderBy("bands.id", "DESC");

    return paginateRaw(builder as unknown as SelectQueryBuilder<BandSearchRow>, {
      page: filters.page_no ?? DEFAULT_PAGE_NO,
      limit: filters.page_size ?? DEFAULT_SEARCH_PAGE_SIZE,
    });
  }
}
