import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { MusicalInterest } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { TABLE_BAND_MEMBER_INTERESTS } from "@soundcircle/shared/utils/util/database.table";

/** A musical interest from a member's introduction to their band. */
@Entity(TABLE_BAND_MEMBER_INTERESTS)
@Index(`${TABLE_BAND_MEMBER_INTERESTS}_uq_band_member_id_interest`, ["band_member_id", "interest"], { unique: true, where: "deleted_at IS NULL" })
export class BandMemberInterestEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_member_id: number;

  @ManyToOne(() => BandMemberEntity)
  @JoinColumn({ name: "band_member_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBER_INTERESTS}_fk_band_member_id` })
  band_member: BandMemberEntity;

  @Column({ type: "smallint", nullable: false })
  interest: MusicalInterest;
}
