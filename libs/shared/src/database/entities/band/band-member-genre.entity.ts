import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";
import { TABLE_BAND_MEMBER_GENRES } from "@soundcircle/shared/utils/util/database.table";

/** A favourite genre from a member's introduction to their band. */
@Entity(TABLE_BAND_MEMBER_GENRES)
@Index(`${TABLE_BAND_MEMBER_GENRES}_uq_band_member_id_genre_id`, ["band_member_id", "genre_id"], { unique: true, where: "deleted_at IS NULL" })
export class BandMemberGenreEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  band_member_id: number;

  @ManyToOne(() => BandMemberEntity)
  @JoinColumn({ name: "band_member_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBER_GENRES}_fk_band_member_id` })
  band_member: BandMemberEntity;

  @Column({ type: "int", nullable: false })
  genre_id: number;

  @ManyToOne(() => GenreEntity)
  @JoinColumn({ name: "genre_id", foreignKeyConstraintName: `${TABLE_BAND_MEMBER_GENRES}_fk_genre_id` })
  genre: GenreEntity;
}
