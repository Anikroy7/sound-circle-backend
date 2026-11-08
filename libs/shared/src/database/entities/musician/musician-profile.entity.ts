import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { BandInterest } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { TABLE_MUSICIAN_PROFILES } from "@soundcircle/shared/utils/util/database.table";

/** One per user, created by profile setup step 1 (schema-design §4.4). The name lives on `users`. */
@Entity(TABLE_MUSICIAN_PROFILES)
@Index(`${TABLE_MUSICIAN_PROFILES}_uq_user_id`, ["user_id"], { unique: true, where: "deleted_at IS NULL" })
@Index(`${TABLE_MUSICIAN_PROFILES}_uq_slug`, ["slug"], { unique: true, where: "deleted_at IS NULL" })
@Check(`${TABLE_MUSICIAN_PROFILES}_ck_setup_step`, "setup_step BETWEEN 0 AND 8")
@Check(`${TABLE_MUSICIAN_PROFILES}_ck_profile_completion`, "profile_completion BETWEEN 0 AND 100")
export class MusicianProfileEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  user_id: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_PROFILES}_fk_user_id` })
  user: UserEntity;

  @Column({ type: "varchar", length: 120, nullable: false })
  slug: string;

  @Column({ type: "text", nullable: true })
  bio: string;

  @Column({ type: "smallint", nullable: true })
  band_interest: BandInterest;

  /** The profile photo on Cloudinary (`soundcircle/users/<user id>/avatar/…`); null for none. */
  @Column({ type: "varchar", length: 255, nullable: true })
  photo_public_id: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  photo_url: string | null;

  /** The last completed setup step, 0–8. Saving step N needs N − 1. */
  @Column({ type: "smallint", nullable: false, default: 0 })
  setup_step: number;

  /** 0–100, recomputed on every profile write (schema-design §5.3). */
  @Column({ type: "smallint", nullable: false, default: 0 })
  profile_completion: number;

  /** True once the profile has an instrument, so empty profiles stay out of search. */
  @Column({ type: "boolean", nullable: false, default: false })
  is_discoverable: boolean;
}
