import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { Weekday } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { TABLE_MUSICIAN_AVAILABILITY_SLOTS } from "@soundcircle/shared/utils/util/database.table";

/**
 * Step 5: when the musician is free. A null day is any day; null times are any time; an end before
 * the start runs past midnight. `(null, null, null)` is "any day, any time" (schema-design §4.4).
 */
@Entity(TABLE_MUSICIAN_AVAILABILITY_SLOTS)
@Index(`${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_idx_musician_profile_id`, ["musician_profile_id"])
@Check(`${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_ck_time_range`, "(start_time IS NULL) = (end_time IS NULL)")
@Check(`${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_ck_time_not_empty`, "start_time IS NULL OR start_time <> end_time")
export class MusicianAvailabilitySlotEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  musician_profile_id: number;

  @ManyToOne(() => MusicianProfileEntity)
  @JoinColumn({ name: "musician_profile_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_fk_musician_profile_id` })
  musician_profile: MusicianProfileEntity;

  @Column({ type: "smallint", nullable: true })
  day_of_week: Weekday;

  /** `HH:MM:SS`, as Postgres returns a `time`. */
  @Column({ type: "time", nullable: true })
  start_time: string;

  @Column({ type: "time", nullable: true })
  end_time: string;
}
