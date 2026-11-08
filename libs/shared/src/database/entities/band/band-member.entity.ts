import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { BandMemberRole } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { TABLE_BAND_MEMBERS } from "@soundcircle/shared/utils/util/database.table";

/**
 * A band's line-up (creation step 2, and Invite Members later). A member is either a SoundCircle user
 * (`user_id`; name and photo come from their account) or someone outside it (`name`, optional photo).
 */
@Entity(TABLE_BAND_MEMBERS)
@Index(`${TABLE_BAND_MEMBERS}_uq_band_id_user_id`, ["band_id", "user_id"], { unique: true, where: "user_id IS NOT NULL AND deleted_at IS NULL" })
@Index(`${TABLE_BAND_MEMBERS}_uq_band_id_owner`, ["band_id"], { unique: true, where: "role = 1 AND deleted_at IS NULL" })
@Index(`${TABLE_BAND_MEMBERS}_idx_user_id`, ["user_id"])
@Check(`${TABLE_BAND_MEMBERS}_ck_user_or_name`, "(user_id IS NULL) = (name IS NOT NULL)")
@Check(`${TABLE_BAND_MEMBERS}_ck_owner_is_user`, "role <> 1 OR user_id IS NOT NULL")
export class BandMemberEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_id: number;

  @ManyToOne(() => BandEntity)
  @JoinColumn({ name: "band_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERS}_fk_band_id` })
  band: BandEntity;

  /** Null for a member who is not on SoundCircle. */
  @Column({ type: "int", nullable: true })
  user_id: number | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBERS}_fk_user_id` })
  user: UserEntity;

  @Column({ type: "smallint", nullable: false })
  role: BandMemberRole;

  /** A member outside SoundCircle only. */
  @Column({ type: "varchar", length: 100, nullable: true })
  name: string | null;

  /** Their role or instrument in this band: "Lead guitar", "Vocals". */
  @Column({ type: "varchar", length: 120, nullable: true })
  position: string | null;

  /** A member outside SoundCircle only: their photo on Cloudinary. */
  @Column({ type: "varchar", length: 255, nullable: true })
  photo_public_id: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  photo_url: string | null;
}
