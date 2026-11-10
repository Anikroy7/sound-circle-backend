import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandOpenRoleEntity } from "@soundcircle/shared/database/entities/band/band-open-role.entity";
import { OpenRoleStatus } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { TABLE_INSTRUMENTS } from "@soundcircle/shared/utils/util/database.table";

/** An open position as the band page shows it. */
export interface OpenRoleRow {
  id: number;
  instrument_id: number;
  instrument_name: string;
  description: string | null;
}

@Injectable()
export class BandOpenRoleRepository extends Repository<BandOpenRoleEntity> {
  constructor(@InjectRepository(BandOpenRoleEntity) repository: Repository<BandOpenRoleEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /** The band's open positions, in instrument picker order. */
  async getOpenByBandId(bandId: number): Promise<OpenRoleRow[]> {
    return this.createQueryBuilder("roles")
      .select(["roles.id as id", "roles.instrument_id as instrument_id", "instruments.name as instrument_name", "roles.description as description"])
      .innerJoin(TABLE_INSTRUMENTS, "instruments", "instruments.id = roles.instrument_id")
      .where("roles.band_id = :bandId", { bandId })
      .andWhere("roles.status = :open", { open: OpenRoleStatus.OPEN })
      .andWhere("roles.deleted_at IS NULL")
      .orderBy("instruments.sort_order", "ASC")
      .addOrderBy("roles.id", "ASC")
      .getRawMany();
  }
}
