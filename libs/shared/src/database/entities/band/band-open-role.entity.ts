import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { OpenRoleStatus } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { TABLE_BAND_OPEN_ROLES } from "@soundcircle/shared/utils/util/database.table";

/**
 * A position a band is looking to fill (schema-design §4.5). ⚠ A role is an instrument, so "looking
 * for a drummer" is `instrument_id` = Drums and a role search is an instrument search.
 */
@Entity(TABLE_BAND_OPEN_ROLES)
@Index(`${TABLE_BAND_OPEN_ROLES}_idx_band_id_status`, ["band_id", "status"])
export class BandOpenRoleEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_id: number;

  @ManyToOne(() => BandEntity)
  @JoinColumn({ name: "band_id", foreignKeyConstraintName: `${TABLE_BAND_OPEN_ROLES}_fk_band_id` })
  band: BandEntity;

  @Column({ type: "int", nullable: false })
  instrument_id: number;

  @ManyToOne(() => InstrumentEntity)
  @JoinColumn({ name: "instrument_id", foreignKeyConstraintName: `${TABLE_BAND_OPEN_ROLES}_fk_instrument_id` })
  instrument: InstrumentEntity;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({ type: "smallint", nullable: false, default: OpenRoleStatus.OPEN })
  status: OpenRoleStatus;

  /** Set when an accepted request fills it. */
  @Column({ type: "int", nullable: true })
  filled_by_user_id: number | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "filled_by_user_id", foreignKeyConstraintName: `${TABLE_BAND_OPEN_ROLES}_fk_filled_by_user_id` })
  filled_by_user: UserEntity;
}
