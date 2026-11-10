import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";

@Injectable()
export class InstrumentRepository extends Repository<InstrumentEntity> {
  constructor(@InjectRepository(InstrumentEntity) repository: Repository<InstrumentEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  LIST_SELECTED_COLUMNS: string[] = ["instruments.id as id", "instruments.name as name", "instruments.family as family"];

  /** The whole catalogue in picker order. Small and seeded, so never paginated. */
  async getAll(): Promise<InstrumentEntity[]> {
    return this.createQueryBuilder("instruments")
      .select(this.LIST_SELECTED_COLUMNS)
      .where("instruments.deleted_at IS NULL")
      .orderBy("instruments.sort_order", "ASC")
      .addOrderBy("instruments.name", "ASC")
      .getRawMany();
  }

  /** The ids that exist, so a caller can name the unknown ones. */
  async getExistingIds(ids: number[]): Promise<number[]> {
    if (!ids.length) return [];
    const rows = await this.createQueryBuilder("instruments")
      .select("instruments.id as id")
      .where("instruments.id IN (:...ids)", { ids })
      .andWhere("instruments.deleted_at IS NULL")
      .getRawMany();
    return rows.map((row) => row.id);
  }
}
