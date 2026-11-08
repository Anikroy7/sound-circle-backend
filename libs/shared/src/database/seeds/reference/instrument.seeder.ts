import { EntityManager } from "typeorm";
import { InstrumentEntity } from "@soundcircle/shared/database/entities/reference/instrument.entity";
import { Seeder } from "@soundcircle/shared/database/seeds/seeder";
import { TABLE_INSTRUMENTS } from "@soundcircle/shared/utils/util/database.table";

/**
 * Instruments commonly played in Bangladesh, Western and local (schema-design §4.2), in the order
 * the picker lists them: voice and the band core first, then keys, Bangladeshi folk and classical,
 * percussion, winds and the rest.
 *
 * ⚠ The ids are contract: a musician's row points at them. Append new instruments with new ids;
 * never renumber or reuse one. A retired instrument is soft-deleted, not removed from this list.
 */
export const INSTRUMENTS: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: "Vocals" },
  { id: 2, name: "Acoustic guitar" },
  { id: 3, name: "Electric guitar" },
  { id: 4, name: "Bass guitar" },
  { id: 5, name: "Drums" },
  { id: 6, name: "Keyboard" },
  { id: 7, name: "Piano" },
  { id: 8, name: "Synthesizer" },
  { id: 9, name: "Harmonium" },
  { id: 10, name: "Tabla" },
  { id: 11, name: "Dhol" },
  { id: 12, name: "Dholak" },
  { id: 13, name: "Khol (Mridanga)" },
  { id: 14, name: "Dotara" },
  { id: 15, name: "Ektara" },
  { id: 16, name: "Bansuri (flute)" },
  { id: 17, name: "Esraj" },
  { id: 18, name: "Sarod" },
  { id: 19, name: "Sitar" },
  { id: 20, name: "Sarangi" },
  { id: 21, name: "Violin" },
  { id: 22, name: "Mandolin" },
  { id: 23, name: "Ukulele" },
  { id: 24, name: "Cajón" },
  { id: 25, name: "Percussion" },
  { id: 26, name: "Mandira / Kartal" },
  { id: 27, name: "Saxophone" },
  { id: 28, name: "Trumpet" },
  { id: 29, name: "Harmonica" },
  { id: 30, name: "DJ / Electronic production" },
];

/** Pure, so the spec checks the list without a database. `sort_order` is the list position. */
export const buildInstrumentRows = (): Pick<InstrumentEntity, "id" | "name" | "sort_order">[] =>
  INSTRUMENTS.map((instrument, index) => ({ ...instrument, sort_order: index + 1 }));

export class InstrumentSeeder implements Seeder {
  name = "instruments";

  async run(manager: EntityManager): Promise<void> {
    const rows = buildInstrumentRows();
    await manager.upsert(InstrumentEntity, rows, { conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true });

    // ⚠ The ids were explicit, so the identity sequence never moved; without this an instrument added by hand collides with id 1.
    await manager.query(`SELECT setval(pg_get_serial_sequence('${TABLE_INSTRUMENTS}', 'id'), (SELECT max(id) FROM ${TABLE_INSTRUMENTS}))`);

    console.log(`  ${rows.length} instruments upserted`);
  }
}
