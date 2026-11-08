import "reflect-metadata";
import { DataSource } from "typeorm";
import DatabaseConfig from "@soundcircle/shared/config/database.config";
import { Seeder } from "@soundcircle/shared/database/seeds/seeder";
import { LocationSeeder } from "@soundcircle/shared/database/seeds/reference/location.seeder";
import { InstrumentSeeder } from "@soundcircle/shared/database/seeds/reference/instrument.seeder";
import { GenreSeeder } from "@soundcircle/shared/database/seeds/reference/genre.seeder";

/**
 * `yarn seed:run` — run AFTER `yarn migration:run`. Every seeder, in this order, in one transaction.
 * A seeder whose table references another's goes after it.
 */
const SEEDERS: Seeder[] = [new LocationSeeder(), new InstrumentSeeder(), new GenreSeeder()];

async function seed(): Promise<void> {
  // Logging off: a few hundred upserted rows would otherwise print as one enormous statement.
  const dataSource = await new DataSource({ ...DatabaseConfig, logging: false }).initialize();

  try {
    await dataSource.transaction(async (manager) => {
      for (const seeder of SEEDERS) {
        console.log(`seeding ${seeder.name}`);
        await seeder.run(manager);
      }
    });
  } finally {
    await dataSource.destroy();
  }
}

seed()
  .then(() => console.log("seeding done"))
  .catch((error) => {
    console.error("seeding failed, nothing was written", error);
    process.exit(1);
  });
