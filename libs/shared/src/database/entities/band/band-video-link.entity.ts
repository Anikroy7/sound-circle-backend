import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { VideoProvider } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { TABLE_BAND_VIDEO_LINKS } from "@soundcircle/shared/utils/util/database.table";

/** A band's performance video: a YouTube / Facebook / Vimeo link (creation step 3). */
@Entity(TABLE_BAND_VIDEO_LINKS)
@Index(`${TABLE_BAND_VIDEO_LINKS}_idx_band_id`, ["band_id"])
export class BandVideoLinkEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_id: number;

  @ManyToOne(() => BandEntity)
  @JoinColumn({ name: "band_id", foreignKeyConstraintName: `${TABLE_BAND_VIDEO_LINKS}_fk_band_id` })
  band: BandEntity;

  @Column({ type: "smallint", nullable: false })
  provider: VideoProvider;

  @Column({ type: "varchar", length: 64, nullable: false })
  external_video_id: string;

  @Column({ type: "varchar", length: 512, nullable: false })
  url: string;

  @Column({ type: "smallint", nullable: false, default: 0 })
  sort_order: number;
}
