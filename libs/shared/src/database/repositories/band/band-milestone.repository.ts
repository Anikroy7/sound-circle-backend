import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandMilestoneEntity } from "@soundcircle/shared/database/entities/band/band-milestone.entity";
import { BandMilestone } from "@soundcircle/shared/database/entities/band/enums/band.enum";

@Injectable()
export class BandMilestoneRepository extends Repository<BandMilestoneEntity> {
  constructor(@InjectRepository(BandMilestoneEntity) repository: Repository<BandMilestoneEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /** The milestones the band has unlocked, with when. */
  async getByBandId(bandId: number): Promise<{ milestone: BandMilestone; achieved_at: Date }[]> {
    return this.createQueryBuilder("milestones")
      .select(["milestones.milestone as milestone", "milestones.achieved_at as achieved_at"])
      .where("milestones.band_id = :bandId", { bandId })
      .andWhere("milestones.deleted_at IS NULL")
      .orderBy("milestones.milestone", "ASC")
      .getRawMany();
  }
}
