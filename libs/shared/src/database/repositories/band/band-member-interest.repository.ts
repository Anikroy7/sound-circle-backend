import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BandMemberInterestEntity } from "@soundcircle/shared/database/entities/band/band-member-interest.entity";
import { MusicalInterest } from "@soundcircle/shared/database/entities/band/enums/band.enum";

@Injectable()
export class BandMemberInterestRepository extends Repository<BandMemberInterestEntity> {
  constructor(@InjectRepository(BandMemberInterestEntity) repository: Repository<BandMemberInterestEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /** The musical interests of these members' introductions. */
  async getByMemberIds(memberIds: number[]): Promise<{ band_member_id: number; interest: MusicalInterest }[]> {
    if (!memberIds.length) return [];
    return this.createQueryBuilder("interests")
      .select(["interests.band_member_id as band_member_id", "interests.interest as interest"])
      .where("interests.band_member_id IN (:...memberIds)", { memberIds })
      .andWhere("interests.deleted_at IS NULL")
      .orderBy("interests.interest", "ASC")
      .getRawMany();
  }
}
