import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandVideoLinkEntity } from "@soundcircle/shared/database/entities/band/band-video-link.entity";

@Injectable()
export class BandVideoLinkRepository extends Repository<BandVideoLinkEntity> {
  constructor(@InjectRepository(BandVideoLinkEntity) repository: Repository<BandVideoLinkEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async getByBandId(bandId: number): Promise<BandVideoLinkEntity[]> {
    return this.createQueryBuilder("band_video_links")
      .select([
        "band_video_links.id as id",
        "band_video_links.provider as provider",
        "band_video_links.external_video_id as external_video_id",
        "band_video_links.url as url",
      ])
      .where("band_video_links.band_id = :bandId", { bandId })
      .andWhere("band_video_links.deleted_at IS NULL")
      .orderBy("band_video_links.sort_order", "ASC")
      .getRawMany();
  }
}
