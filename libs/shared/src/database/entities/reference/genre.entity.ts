import { Column, Entity, Index } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { TABLE_GENRES } from "@soundcircle/shared/utils/util/database.table";

/** Seeded (`genre.seeder.ts`) — schema-design §4.2. */
@Entity(TABLE_GENRES)
@Index(`${TABLE_GENRES}_uq_name`, ["name"], { unique: true, where: "deleted_at IS NULL" })
export class GenreEntity extends AbstractEntity {
  @Column({ type: "varchar", length: 60, nullable: false })
  name: string;

  @Column({ type: "smallint", nullable: false, default: 0 })
  sort_order: number;
}
