import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserLocationEntity } from "@soundcircle/shared/database/entities/identity/user-location.entity";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";

@Injectable()
export class UserLocationRepository extends Repository<UserLocationEntity> {
  constructor(@InjectRepository(UserLocationEntity) repository: Repository<UserLocationEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /** A user's available locations, widest first. */
  async getByUserId(userId: number): Promise<LocationEntity[]> {
    return this.createQueryBuilder("user_locations")
      .innerJoin("user_locations.location", "locations", "locations.deleted_at IS NULL")
      .select([
        "locations.id as id",
        "locations.parent_id as parent_id",
        "locations.level as level",
        "locations.type as type",
        "locations.name as name",
        "locations.name_bn as name_bn",
      ])
      .where("user_locations.user_id = :userId", { userId })
      .andWhere("user_locations.deleted_at IS NULL")
      .orderBy("locations.level", "ASC")
      .addOrderBy("locations.name", "ASC")
      .getRawMany();
  }
}
