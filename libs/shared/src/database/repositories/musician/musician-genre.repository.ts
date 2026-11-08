import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MusicianGenreEntity } from "@soundcircle/shared/database/entities/musician/musician-genre.entity";

@Injectable()
export class MusicianGenreRepository extends Repository<MusicianGenreEntity> {
  constructor(@InjectRepository(MusicianGenreEntity) repository: Repository<MusicianGenreEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = ["musician_genres.id as id", "musician_genres.genre_id as genre_id", "musician_genres.relation as relation"];

  async getByProfileId(musicianProfileId: number): Promise<MusicianGenreEntity[]> {
    return this.createQueryBuilder("musician_genres")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("musician_genres.musician_profile_id = :musicianProfileId", { musicianProfileId })
      .andWhere("musician_genres.deleted_at IS NULL")
      .orderBy("musician_genres.id", "ASC")
      .getRawMany();
  }
}
