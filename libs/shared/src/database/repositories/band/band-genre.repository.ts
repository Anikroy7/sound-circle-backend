import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandGenreEntity } from "@soundcircle/shared/database/entities/band/band-genre.entity";
import { TABLE_GENRES } from "@soundcircle/shared/utils/util/database.table";

@Injectable()
export class BandGenreRepository extends Repository<BandGenreEntity> {
  constructor(@InjectRepository(BandGenreEntity) repository: Repository<BandGenreEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /** The band's genres with their names, alphabetically. */
  async getByBandId(bandId: number): Promise<{ id: number; name: string }[]> {
    return this.createQueryBuilder("band_genres")
      .select(["genres.id as id", "genres.name as name"])
      .innerJoin(TABLE_GENRES, "genres", "genres.id = band_genres.genre_id")
      .where("band_genres.band_id = :bandId", { bandId })
      .andWhere("band_genres.deleted_at IS NULL")
      .orderBy("genres.name", "ASC")
      .getRawMany();
  }
}
