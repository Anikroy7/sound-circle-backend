import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandEntity } from "@soundcircle/shared/database/entities/band/band.entity";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";
import { TABLE_BAND_GENRES } from "@soundcircle/shared/utils/util/database.table";

/** The genres a band performs (creation step 1). */
@Entity(TABLE_BAND_GENRES)
@Index(`${TABLE_BAND_GENRES}_uq_band_id_genre_id`, ["band_id", "genre_id"], { unique: true, where: "deleted_at IS NULL" })
export class BandGenreEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_id: number;

  @ManyToOne(() => BandEntity)
  @JoinColumn({ name: "band_id", foreignKeyConstraintName: `${TABLE_BAND_GENRES}_fk_band_id` })
  band: BandEntity;

  @Column({ type: "int", nullable: false })
  genre_id: number;

  @ManyToOne(() => GenreEntity)
  @JoinColumn({ name: "genre_id", foreignKeyConstraintName: `${TABLE_BAND_GENRES}_fk_genre_id` })
  genre: GenreEntity;
}
