import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PortfolioMediaEntity } from "@soundcircle/shared/database/entities/media/portfolio-media.entity";
import { MediaOwnerType, MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";

@Injectable()
export class PortfolioMediaRepository extends Repository<PortfolioMediaEntity> {
  constructor(@InjectRepository(PortfolioMediaEntity) repository: Repository<PortfolioMediaEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "portfolio_media.id as id",
    "portfolio_media.owner_type as owner_type",
    "portfolio_media.owner_id as owner_id",
    "portfolio_media.media_type as media_type",
    "portfolio_media.file_name as file_name",
    "portfolio_media.public_id as public_id",
    "portfolio_media.secure_url as secure_url",
    "portfolio_media.format as format",
    "portfolio_media.file_size as file_size",
    "portfolio_media.duration_seconds as duration_seconds",
  ];

  /** Every item of these owners, oldest first (the order they were uploaded). */
  async getByOwners(ownerType: MediaOwnerType, ownerIds: number[]): Promise<PortfolioMediaEntity[]> {
    if (!ownerIds.length) return [];
    return this.createQueryBuilder("portfolio_media")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("portfolio_media.owner_type = :ownerType", { ownerType })
      .andWhere("portfolio_media.owner_id IN (:...ownerIds)", { ownerIds })
      .andWhere("portfolio_media.deleted_at IS NULL")
      .orderBy("portfolio_media.id", "ASC")
      .getRawMany();
  }

  async countByOwner(ownerType: MediaOwnerType, ownerId: number, mediaType: MediaType): Promise<number> {
    return this.createQueryBuilder("portfolio_media")
      .where("portfolio_media.owner_type = :ownerType", { ownerType })
      .andWhere("portfolio_media.owner_id = :ownerId", { ownerId })
      .andWhere("portfolio_media.media_type = :mediaType", { mediaType })
      .andWhere("portfolio_media.deleted_at IS NULL")
      .getCount();
  }

  async getOne(id: number): Promise<PortfolioMediaEntity> {
    return this.createQueryBuilder("portfolio_media")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("portfolio_media.id = :id", { id })
      .andWhere("portfolio_media.deleted_at IS NULL")
      .getRawOne();
  }
}
