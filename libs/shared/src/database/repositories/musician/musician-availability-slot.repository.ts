import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MusicianAvailabilitySlotEntity } from "@soundcircle/shared/database/entities/musician/musician-availability-slot.entity";

@Injectable()
export class MusicianAvailabilitySlotRepository extends Repository<MusicianAvailabilitySlotEntity> {
  constructor(@InjectRepository(MusicianAvailabilitySlotEntity) repository: Repository<MusicianAvailabilitySlotEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  DEFAULT_SELECTED_COLUMNS: string[] = [
    "musician_availability_slots.id as id",
    "musician_availability_slots.day_of_week as day_of_week",
    "musician_availability_slots.start_time as start_time",
    "musician_availability_slots.end_time as end_time",
  ];

  async getByProfileId(musicianProfileId: number): Promise<MusicianAvailabilitySlotEntity[]> {
    return this.createQueryBuilder("musician_availability_slots")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("musician_availability_slots.musician_profile_id = :musicianProfileId", { musicianProfileId })
      .andWhere("musician_availability_slots.deleted_at IS NULL")
      .orderBy("musician_availability_slots.id", "ASC")
      .getRawMany();
  }
}
