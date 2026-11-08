import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { MusicianBandExperienceEntity } from "@soundcircle/shared/database/entities/musician/musician-band-experience.entity";
import { VideoProvider } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { TABLE_MUSICIAN_VIDEO_LINKS } from "@soundcircle/shared/utils/util/database.table";

/** A YouTube / Facebook / Vimeo link. Video files are never uploaded (schema-design §4.4). */
@Entity(TABLE_MUSICIAN_VIDEO_LINKS)
@Index(`${TABLE_MUSICIAN_VIDEO_LINKS}_idx_musician_profile_id`, ["musician_profile_id"])
@Index(`${TABLE_MUSICIAN_VIDEO_LINKS}_idx_band_experience_id`, ["band_experience_id"])
export class MusicianVideoLinkEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  musician_profile_id: number;

  @ManyToOne(() => MusicianProfileEntity)
  @JoinColumn({ name: "musician_profile_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_VIDEO_LINKS}_fk_musician_profile_id` })
  musician_profile: MusicianProfileEntity;

  /** Null = the musician's own gallery (step 7); set = a band experience's video (step 8). */
  @Column({ type: "int", nullable: true })
  band_experience_id: number;

  @ManyToOne(() => MusicianBandExperienceEntity)
  @JoinColumn({ name: "band_experience_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_VIDEO_LINKS}_fk_band_experience_id` })
  band_experience: MusicianBandExperienceEntity;

  @Column({ type: "smallint", nullable: false })
  provider: VideoProvider;

  /** Parsed from `url` on save (`video-link.util.ts`). */
  @Column({ type: "varchar", length: 64, nullable: false })
  external_video_id: string;

  @Column({ type: "varchar", length: 512, nullable: false })
  url: string;

  @Column({ type: "smallint", nullable: false, default: 0 })
  sort_order: number;
}
