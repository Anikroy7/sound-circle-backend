import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MusicianBandExperienceEntity } from "@soundcircle/shared/database/entities/musician/musician-band-experience.entity";

@Injectable()
export class MusicianBandExperienceRepository extends Repository<MusicianBandExperienceEntity> {
  constructor(@InjectRepository(MusicianBandExperienceEntity) repository: Repository<MusicianBandExperienceEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "musician_band_experiences.id as id",
    "musician_band_experiences.band_name as band_name",
    "musician_band_experiences.role as role",
    "musician_band_experiences.is_current as is_current",
  ];

  async getByProfileId(musicianProfileId: number): Promise<MusicianBandExperienceEntity[]> {
    return this.createQueryBuilder("musician_band_experiences")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("musician_band_experiences.musician_profile_id = :musicianProfileId", { musicianProfileId })
      .andWhere("musician_band_experiences.deleted_at IS NULL")
      .orderBy("musician_band_experiences.id", "ASC")
      .getRawMany();
  }
}
