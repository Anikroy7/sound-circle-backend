import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";

@Injectable()
export class MusicianProfileRepository extends Repository<MusicianProfileEntity> {
  constructor(@InjectRepository(MusicianProfileEntity) repository: Repository<MusicianProfileEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "musician_profiles.id as id",
    "musician_profiles.user_id as user_id",
    "musician_profiles.slug as slug",
    "musician_profiles.bio as bio",
    "musician_profiles.band_interest as band_interest",
    "musician_profiles.photo_url as photo_url",
    "musician_profiles.setup_step as setup_step",
    "musician_profiles.profile_completion as profile_completion",
    "musician_profiles.is_discoverable as is_discoverable",
  ];

  /** The signed-in user's own profile, or undefined before setup step 1. */
  async getByUserId(userId: number): Promise<MusicianProfileEntity | undefined> {
    return this.createQueryBuilder("musician_profiles")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("musician_profiles.user_id = :userId", { userId })
      .andWhere("musician_profiles.deleted_at IS NULL")
      .getRawOne();
  }
}
