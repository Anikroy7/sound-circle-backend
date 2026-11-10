import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandOpenRoleEntity } from "@soundcircle/shared/database/entities/band/band-open-role.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { MembershipRequestStatus, MembershipRequestType } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { TABLE_BAND_MEMBERSHIP_REQUESTS } from "@soundcircle/shared/utils/util/database.table";

/**
 * Both directions of joining a band (schema-design §4.5): an owner's invitation to a musician, and a
 * musician's request to join. `user_id` is the musician either way. At most one is pending per band and
 * musician (`_uq_band_id_user_id_pending`), so a lost race on send is a 23505 → 409.
 */
@Entity(TABLE_BAND_MEMBERSHIP_REQUESTS)
@Index(`${TABLE_BAND_MEMBERSHIP_REQUESTS}_uq_band_id_user_id_pending`, ["band_id", "user_id"], {
  unique: true,
  where: "status = 1 AND deleted_at IS NULL",
})
@Index(`${TABLE_BAND_MEMBERSHIP_REQUESTS}_idx_user_id_status`, ["user_id", "status"])
@Index(`${TABLE_BAND_MEMBERSHIP_REQUESTS}_idx_band_id_status`, ["band_id", "status"])
export class BandMembershipRequestEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_id: number;

  @ManyToOne(() => BandEntity)
  @JoinColumn({ name: "band_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_fk_band_id` })
  band: BandEntity;

  /** The musician, in both directions. */
  @Column({ type: "int", nullable: false })
  user_id: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_fk_user_id` })
  user: UserEntity;

  @Column({ type: "smallint", nullable: false })
  type: MembershipRequestType;

  /** The open position it is for, when there is one. Accepting fills it. */
  @Column({ type: "int", nullable: true })
  open_role_id: number | null;

  @ManyToOne(() => BandOpenRoleEntity)
  @JoinColumn({ name: "open_role_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_fk_open_role_id` })
  open_role: BandOpenRoleEntity;

  /** What they would play. Becomes the member's position on accept. */
  @Column({ type: "int", nullable: true })
  instrument_id: number | null;

  @ManyToOne(() => InstrumentEntity)
  @JoinColumn({ name: "instrument_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_fk_instrument_id` })
  instrument: InstrumentEntity;

  @Column({ type: "varchar", length: 1000, nullable: true })
  message: string | null;

  @Column({ type: "smallint", nullable: false, default: MembershipRequestStatus.PENDING })
  status: MembershipRequestStatus;

  /** The owner for an invitation, the musician for a join request. */
  @Column({ type: "int", nullable: false })
  sent_by_user_id: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "sent_by_user_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_fk_sent_by_user_id` })
  sent_by_user: UserEntity;

  @Column({ type: "int", nullable: true })
  responded_by_user_id: number | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "responded_by_user_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_fk_responded_by_user_id` })
  responded_by_user: UserEntity;

  @Column({ type: "timestamptz", nullable: true })
  responded_at: Date | null;

  /** ⚠ Nothing sweeps overdue rows: reads treat a pending row past this as expired, and a new send expires it for real. */
  @Column({ type: "timestamptz", nullable: false })
  expires_at: Date;
}
