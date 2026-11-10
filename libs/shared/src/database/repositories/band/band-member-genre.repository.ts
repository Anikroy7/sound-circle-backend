import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandMemberGenreEntity } from "@soundcircle/shared/database/entities/band/band-member-genre.entity";
import { TABLE_GENRES } from "@soundcircle/shared/utils/util/database.table";

@Injectable()
export class BandMemberGenreRepository extends Repository<BandMemberGenreEntity> {
  constructor(@InjectRepository(BandMemberGenreEntity) repository: Repository<BandMemberGenreEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /** The favourite genres of these members' introductions, in genre picker order. */
  async getByMemberIds(memberIds: number[]): Promise<{ band_member_id: number; id: number; name: string }[]> {
    if (!memberIds.length) return [];
    return this.createQueryBuilder("favourites")
      .select(["favourites.band_member_id as band_member_id", "genres.id as id", "genres.name as name"])
      .innerJoin(TABLE_GENRES, "genres", "genres.id = favourites.genre_id")
      .where("favourites.band_member_id IN (:...memberIds)", { memberIds })
      .andWhere("favourites.deleted_at IS NULL")
      .orderBy("genres.sort_order", "ASC")
      .getRawMany();
  }
}
