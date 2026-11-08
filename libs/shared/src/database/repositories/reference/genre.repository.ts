import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";

@Injectable()
export class GenreRepository extends Repository<GenreEntity> {
  constructor(@InjectRepository(GenreEntity) repository: Repository<GenreEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  LIST_SELECTED_COLUMNS: string[] = ["genres.id as id", "genres.name as name"];

  /** The whole catalogue in picker order. Small and seeded, so never paginated. */
  async getAll(): Promise<GenreEntity[]> {
    return this.createQueryBuilder("genres")
      .select(this.LIST_SELECTED_COLUMNS)
      .where("genres.deleted_at IS NULL")
      .orderBy("genres.sort_order", "ASC")
      .addOrderBy("genres.name", "ASC")
      .getRawMany();
  }

  /** The ids that exist, so a caller can name the unknown ones. */
  async getExistingIds(ids: number[]): Promise<number[]> {
    if (!ids.length) return [];
    const rows = await this.createQueryBuilder("genres")
      .select("genres.id as id")
      .where("genres.id IN (:...ids)", { ids })
      .andWhere("genres.deleted_at IS NULL")
      .getRawMany();
    return rows.map((row) => row.id);
  }
}
