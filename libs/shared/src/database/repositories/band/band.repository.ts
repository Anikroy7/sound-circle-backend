import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandMemberRole } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { TABLE_BAND_MEMBERS } from "@soundcircle/shared/utils/util/database.table";

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
}
