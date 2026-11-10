import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandMilestone } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { TABLE_BAND_MILESTONES } from "@soundcircle/shared/utils/util/database.table";

/**
 * A milestone a band has unlocked (schema-design §4.5). Written in the same transaction that adds the
 * member who reached it; never removed when a member later leaves.
 */
@Entity(TABLE_BAND_MILESTONES)
@Index(`${TABLE_BAND_MILESTONES}_uq_band_id_milestone`, ["band_id", "milestone"], { unique: true, where: "deleted_at IS NULL" })
export class BandMilestoneEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_id: number;

  @ManyToOne(() => BandEntity)
  @JoinColumn({ name: "band_id", foreignKeyConstraintName: `${TABLE_BAND_MILESTONES}_fk_band_id` })
  band: BandEntity;

  @Column({ type: "smallint", nullable: false })
  milestone: BandMilestone;

  @Column({ type: "timestamptz", nullable: false })
  achieved_at: Date;
}
