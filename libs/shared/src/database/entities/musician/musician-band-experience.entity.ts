import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { TABLE_MUSICIAN_BAND_EXPERIENCES } from "@soundcircle/shared/utils/util/database.table";

/**
 * Step 8: a band the musician is in or was in — free text, not a SoundCircle band. Its photos are
 * `portfolio_media` with `owner_type = BAND_EXPERIENCE`; its videos are `musician_video_links`.
 */
@Entity(TABLE_MUSICIAN_BAND_EXPERIENCES)
@Index(`${TABLE_MUSICIAN_BAND_EXPERIENCES}_idx_musician_profile_id`, ["musician_profile_id"])
export class MusicianBandExperienceEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  musician_profile_id: number;

  @ManyToOne(() => MusicianProfileEntity)
  @JoinColumn({ name: "musician_profile_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_BAND_EXPERIENCES}_fk_musician_profile_id` })
  musician_profile: MusicianProfileEntity;

  @Column({ type: "varchar", length: 100, nullable: false })
  band_name: string;

  /** Their role or what they played, e.g. "Lead guitar, backing vocals". */
  @Column({ type: "varchar", length: 120, nullable: false })
  role: string;

  @Column({ type: "boolean", nullable: false, default: false })
  is_current: boolean;
}
