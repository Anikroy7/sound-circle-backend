import { EntityManager } from "typeorm";
import { InstrumentFamily } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
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
const { VOCALS, GUITAR, BASS, DRUMS, KEYS, PERCUSSION, STRINGS, WINDS, ELECTRONIC } = InstrumentFamily;

export const INSTRUMENTS: ReadonlyArray<{ id: number; name: string; family: InstrumentFamily }> = [
  { id: 1, name: "Vocals", family: VOCALS },
  { id: 2, name: "Acoustic guitar", family: GUITAR },
  { id: 3, name: "Electric guitar", family: GUITAR },
  { id: 4, name: "Bass guitar", family: BASS },
  { id: 5, name: "Drums", family: DRUMS },
  { id: 6, name: "Keyboard", family: KEYS },
  { id: 7, name: "Piano", family: KEYS },
  { id: 8, name: "Synthesizer", family: KEYS },
  { id: 9, name: "Harmonium", family: KEYS },
  { id: 10, name: "Tabla", family: PERCUSSION },
  { id: 11, name: "Dhol", family: PERCUSSION },
  { id: 12, name: "Dholak", family: PERCUSSION },
  { id: 13, name: "Khol (Mridanga)", family: PERCUSSION },
  { id: 14, name: "Dotara", family: STRINGS },
  { id: 15, name: "Ektara", family: STRINGS },
  { id: 16, name: "Bansuri (flute)", family: WINDS },
  { id: 17, name: "Esraj", family: STRINGS },
  { id: 18, name: "Sarod", family: STRINGS },
  { id: 19, name: "Sitar", family: STRINGS },
  { id: 20, name: "Sarangi", family: STRINGS },
  { id: 21, name: "Violin", family: STRINGS },
  { id: 22, name: "Mandolin", family: STRINGS },
  { id: 23, name: "Ukulele", family: GUITAR },
  { id: 24, name: "Cajón", family: PERCUSSION },
  { id: 25, name: "Percussion", family: PERCUSSION },
  { id: 26, name: "Mandira / Kartal", family: PERCUSSION },
  { id: 27, name: "Saxophone", family: WINDS },
  { id: 28, name: "Trumpet", family: WINDS },
  { id: 29, name: "Harmonica", family: WINDS },
  { id: 30, name: "DJ / Electronic production", family: ELECTRONIC },
];

/** Pure, so the spec checks the list without a database. `sort_order` is the list position. */
export const buildInstrumentRows = (): Pick<InstrumentEntity, "id" | "name" | "sort_order" | "family">[] =>
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
