import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { SkillLevel } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { TABLE_MUSICIAN_INSTRUMENTS } from "@soundcircle/shared/utils/util/database.table";

/** Step 3: an instrument the musician plays, with their level on it. */
@Entity(TABLE_MUSICIAN_INSTRUMENTS)
@Index(`${TABLE_MUSICIAN_INSTRUMENTS}_uq_musician_profile_id_instrument_id`, ["musician_profile_id", "instrument_id"], {
  unique: true,
  where: "deleted_at IS NULL",
})
@Index(`${TABLE_MUSICIAN_INSTRUMENTS}_idx_instrument_id`, ["instrument_id"])
export class MusicianInstrumentEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  musician_profile_id: number;

  @ManyToOne(() => MusicianProfileEntity)
  @JoinColumn({ name: "musician_profile_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_INSTRUMENTS}_fk_musician_profile_id` })
  musician_profile: MusicianProfileEntity;

  @Column({ type: "int", nullable: false })
  instrument_id: number;

  @ManyToOne(() => InstrumentEntity)
  @JoinColumn({ name: "instrument_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_INSTRUMENTS}_fk_instrument_id` })
  instrument: InstrumentEntity;

  @Column({ type: "smallint", nullable: false })
  skill_level: SkillLevel;
}
