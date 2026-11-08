import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";
import { MusicianProfileEntity } from "@soundcircle/shared/database/entities/musician/musician-profile.entity";
import { GenreRelation } from "@soundcircle/shared/database/entities/musician/enums/musician.enum";
import { TABLE_MUSICIAN_GENRES } from "@soundcircle/shared/utils/util/database.table";

/** Step 2: a genre the musician performs or listens to. */
@Entity(TABLE_MUSICIAN_GENRES)
@Index(`${TABLE_MUSICIAN_GENRES}_uq_musician_profile_id_genre_id_relation`, ["musician_profile_id", "genre_id", "relation"], {
  unique: true,
  where: "deleted_at IS NULL",
})
@Index(`${TABLE_MUSICIAN_GENRES}_idx_genre_id`, ["genre_id"])
export class MusicianGenreEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  musician_profile_id: number;

  @ManyToOne(() => MusicianProfileEntity)
  @JoinColumn({ name: "musician_profile_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_GENRES}_fk_musician_profile_id` })
  musician_profile: MusicianProfileEntity;

  @Column({ type: "int", nullable: false })
  genre_id: number;

  @ManyToOne(() => GenreEntity)
  @JoinColumn({ name: "genre_id", foreignKeyConstraintName: `${TABLE_MUSICIAN_GENRES}_fk_genre_id` })
  genre: GenreEntity;

  @Column({ type: "smallint", nullable: false })
  relation: GenreRelation;
}
