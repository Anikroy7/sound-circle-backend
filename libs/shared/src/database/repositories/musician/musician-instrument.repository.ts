import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { MusicianInstrumentEntity } from "@soundcircle/shared/database/entities/musician/musician-instrument.entity";

@Injectable()
export class MusicianInstrumentRepository extends Repository<MusicianInstrumentEntity> {
  constructor(@InjectRepository(MusicianInstrumentEntity) repository: Repository<MusicianInstrumentEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "musician_instruments.id as id",
    "musician_instruments.instrument_id as instrument_id",
    "musician_instruments.skill_level as skill_level",
  ];

  async getByProfileId(musicianProfileId: number): Promise<MusicianInstrumentEntity[]> {
    return this.createQueryBuilder("musician_instruments")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("musician_instruments.musician_profile_id = :musicianProfileId", { musicianProfileId })
      .andWhere("musician_instruments.deleted_at IS NULL")
      .orderBy("musician_instruments.id", "ASC")
      .getRawMany();
  }
}
