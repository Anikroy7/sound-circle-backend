import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { paginateRaw, Pagination } from "nestjs-typeorm-paginate";
import { Repository, SelectQueryBuilder } from "typeorm";
import { BandInterest, GenreRelation } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { FilterMusicianDto } from "@soundcircle/shared/utils/dtos/musician/filter-musician.dto";
import { DEFAULT_PAGE_NO, DEFAULT_SEARCH_PAGE_SIZE } from "@soundcircle/shared/utils/util/constant";
import {
  TABLE_GENRES,
  TABLE_INSTRUMENTS,
  TABLE_LOCATIONS,
  TABLE_MUSICIAN_GENRES,
  TABLE_MUSICIAN_INSTRUMENTS,
  TABLE_USER_LOCATIONS,
  TABLE_USERS,
} from "@soundcircle/shared/utils/util/database.table";
import { locationsOverlapSql } from "@soundcircle/shared/utils/util/location.util";
import { escapeLike } from "@soundcircle/shared/utils/util/query-param.util";

/** One musician in the discovery results: public fields only, never contact details. */
export interface MusicianSearchRow {
  user_id: number;
  slug: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  band_interest: BandInterest | null;
  profile_completion: number;
  /** "Drums, Vocals": best first. */
  instruments: string | null;
  /** Genres performed: "Rock, Metal". */
  genres: string | null;
  /** Their widest location, for the card; the service labels it. */
  location_id: number | null;
  location_count: number;
}

@Injectable()
export class MusicianProfileRepository extends Repository<MusicianProfileEntity> {
  constructor(@InjectRepository(MusicianProfileEntity) repository: Repository<MusicianProfileEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "musician_profiles.id as id",
    "musician_profiles.user_id as user_id",
    "musician_profiles.slug as slug",
    "musician_profiles.bio as bio",
    "musician_profiles.band_interest as band_interest",
    "musician_profiles.photo_url as photo_url",
    "musician_profiles.setup_step as setup_step",
    "musician_profiles.profile_completion as profile_completion",
    "musician_profiles.is_discoverable as is_discoverable",
  ];

  /** The signed-in user's own profile, or undefined before setup step 1. */
  async getByUserId(userId: number): Promise<MusicianProfileEntity | undefined> {
    return this.createQueryBuilder("musician_profiles")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("musician_profiles.user_id = :userId", { userId })
      .andWhere("musician_profiles.deleted_at IS NULL")
      .getRawOne();
  }

  /** A profile by its public URL. Undefined when there is none or its account is gone. */
  async getBySlug(slug: string): Promise<MusicianProfileEntity | undefined> {
    return this.createQueryBuilder("musician_profiles")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .innerJoin(TABLE_USERS, "users", "users.id = musician_profiles.user_id AND users.deleted_at IS NULL")
      .where("musician_profiles.slug = :slug", { slug })
      .andWhere("musician_profiles.deleted_at IS NULL")
      .getRawOne();
  }

  /**
   * Musician discovery (schema-design §6): discoverable profiles only, `excludeUserId` (the viewer) left
   * out. Always paginated.
   */
  async search(filters: FilterMusicianDto, excludeUserId: number | null): Promise<Pagination<MusicianSearchRow>> {
    const builder = this.createQueryBuilder("profiles")
      .select([
        "profiles.user_id as user_id",
        "profiles.slug as slug",
        "users.name as name",
        "profiles.photo_url as photo_url",
        "profiles.bio as bio",
        "profiles.band_interest as band_interest",
        "profiles.profile_completion as profile_completion",
        `(SELECT string_agg(instruments.name, ', ' ORDER BY played.skill_level DESC, instruments.sort_order)
            FROM ${TABLE_MUSICIAN_INSTRUMENTS} played
            JOIN ${TABLE_INSTRUMENTS} instruments ON instruments.id = played.instrument_id
           WHERE played.musician_profile_id = profiles.id AND played.deleted_at IS NULL) as instruments`,
        `(SELECT string_agg(genres.name, ', ' ORDER BY genres.sort_order)
            FROM ${TABLE_MUSICIAN_GENRES} performed
            JOIN ${TABLE_GENRES} genres ON genres.id = performed.genre_id
           WHERE performed.musician_profile_id = profiles.id AND performed.relation = :performs AND performed.deleted_at IS NULL) as genres`,
        `(SELECT picked.location_id FROM ${TABLE_USER_LOCATIONS} picked
            JOIN ${TABLE_LOCATIONS} place ON place.id = picked.location_id
           WHERE picked.user_id = profiles.user_id AND picked.deleted_at IS NULL
           ORDER BY place.level, place.name LIMIT 1) as location_id`,
        `(SELECT count(*)::int FROM ${TABLE_USER_LOCATIONS} picked WHERE picked.user_id = profiles.user_id AND picked.deleted_at IS NULL) as location_count`,
      ])
      .innerJoin(TABLE_USERS, "users", "users.id = profiles.user_id AND users.deleted_at IS NULL")
      .where("profiles.deleted_at IS NULL")
      .andWhere("profiles.is_discoverable = true")
      .setParameter("performs", GenreRelation.PERFORMS);

    if (excludeUserId) builder.andWhere("profiles.user_id <> :excludeUserId", { excludeUserId });

    if (filters.search) {
      builder.andWhere(
        `(users.name ILIKE :pattern ESCAPE '\\' OR EXISTS (
            SELECT 1 FROM ${TABLE_MUSICIAN_INSTRUMENTS} played
            JOIN ${TABLE_INSTRUMENTS} instruments ON instruments.id = played.instrument_id
           WHERE played.musician_profile_id = profiles.id AND played.deleted_at IS NULL AND instruments.name ILIKE :pattern ESCAPE '\\'))`,
        { pattern: `%${escapeLike(filters.search)}%` },
      );
    }

    if (filters.instrument_ids?.length) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_MUSICIAN_INSTRUMENTS} played
                  WHERE played.musician_profile_id = profiles.id AND played.deleted_at IS NULL AND played.instrument_id IN (:...instrumentIds))`,
        { instrumentIds: filters.instrument_ids },
      );
    }

    if (filters.genre_ids?.length) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_MUSICIAN_GENRES} performed
                  WHERE performed.musician_profile_id = profiles.id AND performed.deleted_at IS NULL
                    AND performed.relation = :performs AND performed.genre_id IN (:...genreIds))`,
        { genreIds: filters.genre_ids },
      );
    }

    if (filters.location_id) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM ${TABLE_USER_LOCATIONS} picked
                   JOIN ${TABLE_LOCATIONS} mine ON mine.id = picked.location_id
                   JOIN ${TABLE_LOCATIONS} wanted ON wanted.id = :locationId AND wanted.deleted_at IS NULL
                  WHERE picked.user_id = profiles.user_id AND picked.deleted_at IS NULL AND ${locationsOverlapSql("mine", "wanted")})`,
        { locationId: filters.location_id },
      );
    }

    if (filters.looking_for_band) {
      builder.andWhere("profiles.band_interest IN (:...interested)", {
        interested: [BandInterest.OPEN_TO_EXISTING_BAND, BandInterest.NEW_BAND_ONLY],
      });
    }

    if (filters.sort === "newest") builder.orderBy("profiles.created_at", "DESC");
    else if (filters.sort === "name") builder.orderBy("users.name", "ASC");
    else builder.orderBy("profiles.profile_completion", "DESC").addOrderBy("profiles.updated_at", "DESC");
    builder.addOrderBy("profiles.id", "DESC");

    return paginateRaw(builder as unknown as SelectQueryBuilder<MusicianSearchRow>, {
      page: filters.page_no ?? DEFAULT_PAGE_NO,
      limit: filters.page_size ?? DEFAULT_SEARCH_PAGE_SIZE,
    });
  }
}
