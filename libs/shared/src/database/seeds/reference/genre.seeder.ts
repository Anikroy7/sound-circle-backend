import { EntityManager } from "typeorm";
import { GenreEntity } from "@soundcircle/shared/database/entities/reference/genre.entity";
import { Seeder } from "@soundcircle/shared/database/seeds/seeder";
import { TABLE_GENRES } from "@soundcircle/shared/utils/util/database.table";

/**
 * Genres for profile setup step 2 (schema-design §4.2): the band genres first, then Bangladeshi
 * traditions, then the rest.
 *
 * ⚠ The ids are contract, as for instruments: append, never renumber or reuse.
 */
export const GENRES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: "Rock" },
  { id: 2, name: "Pop" },
  { id: 3, name: "Metal" },
  { id: 4, name: "Alternative" },
  { id: 5, name: "Indie" },
  { id: 6, name: "Blues" },
  { id: 7, name: "Jazz" },
  { id: 8, name: "Fusion" },
  { id: 9, name: "Acoustic" },
  { id: 10, name: "Bangla folk" },
  { id: 11, name: "Baul" },
  { id: 12, name: "Lalon Geeti" },
  { id: 13, name: "Rabindra Sangeet" },
  { id: 14, name: "Nazrul Geeti" },
  { id: 15, name: "Adhunik (modern Bangla)" },
  { id: 16, name: "Bangla band music" },
  { id: 17, name: "Hindustani classical" },
  { id: 18, name: "Sufi / Qawwali" },
  { id: 19, name: "Film / Playback" },
  { id: 20, name: "Hip-hop / Rap" },
  { id: 21, name: "R&B / Soul" },
  { id: 22, name: "Electronic" },
  { id: 23, name: "Funk" },
  { id: 24, name: "Punk" },
  { id: 25, name: "Progressive" },
  { id: 26, name: "Reggae" },
  { id: 27, name: "Country" },
  { id: 28, name: "Lo-fi" },
  { id: 29, name: "Western classical" },
  { id: 30, name: "Devotional" },
];

/** Pure, so the spec checks the list without a database. `sort_order` is the list position. */
export const buildGenreRows = (): Pick<GenreEntity, "id" | "name" | "sort_order">[] =>
  GENRES.map((genre, index) => ({ ...genre, sort_order: index + 1 }));

export class GenreSeeder implements Seeder {
  name = "genres";

  async run(manager: EntityManager): Promise<void> {
    const rows = buildGenreRows();
    await manager.upsert(GenreEntity, rows, { conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true });

    // ⚠ Explicit ids leave the identity sequence behind; move it past them.
    await manager.query(`SELECT setval(pg_get_serial_sequence('${TABLE_GENRES}', 'id'), (SELECT max(id) FROM ${TABLE_GENRES}))`);

    console.log(`  ${rows.length} genres upserted`);
  }
}
