import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MusicianVideoLinkEntity } from "@soundcircle/shared/database/entities/musician/musician-video-link.entity";

@Injectable()
export class MusicianVideoLinkRepository extends Repository<MusicianVideoLinkEntity> {
  constructor(@InjectRepository(MusicianVideoLinkEntity) repository: Repository<MusicianVideoLinkEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "musician_video_links.id as id",
    "musician_video_links.band_experience_id as band_experience_id",
    "musician_video_links.provider as provider",
    "musician_video_links.external_video_id as external_video_id",
    "musician_video_links.url as url",
  ];

  async getByProfileId(musicianProfileId: number): Promise<MusicianVideoLinkEntity[]> {
    return this.createQueryBuilder("musician_video_links")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("musician_video_links.musician_profile_id = :musicianProfileId", { musicianProfileId })
      .andWhere("musician_video_links.deleted_at IS NULL")
      .orderBy({ "musician_video_links.sort_order": "ASC", "musician_video_links.id": "ASC" })
      .getRawMany();
  }
}
