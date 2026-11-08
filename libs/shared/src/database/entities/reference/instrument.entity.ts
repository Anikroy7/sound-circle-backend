import { Column, Entity, Index } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { TABLE_INSTRUMENTS } from "@soundcircle/shared/utils/util/database.table";

/** Seeded (`instrument.seeder.ts`). ⚠ A band role is an instrument, which is why "Vocals" is a row (schema-design §4.2). */
@Entity(TABLE_INSTRUMENTS)
@Index(`${TABLE_INSTRUMENTS}_uq_name`, ["name"], { unique: true, where: "deleted_at IS NULL" })
export class InstrumentEntity extends AbstractEntity {
  @Column({ type: "varchar", length: 60, nullable: false })
  name: string;

  @Column({ type: "smallint", nullable: false, default: 0 })
  sort_order: number;
}
