import { PostgresDataSourceOptions } from "typeorm/driver/postgres/PostgresDataSourceOptions";
import * as path from "path";
import { types as pgTypes } from "pg";
import { ENV } from "@soundcircle/shared/utils/util/constant";
import { AppEnvironment } from "@soundcircle/shared/utils/util/enums";

const sourcePath = path.join(__dirname, "../");

/**
 * A `date` column (e.g. `profile_views.view_date`) comes back as the raw
 * `YYYY-MM-DD` the database holds, never shifted through the Node process's zone.
 * `timestamptz` is left to the driver — it is zone-aware and parses correctly.
 */
const PG_TYPE_DATE = 1082;
pgTypes.setTypeParser(PG_TYPE_DATE, (value: string) => value);

/**
 * The single TypeORM root configuration, shared by the app and the migration CLI.
 *
 * PostgreSQL only. ⚠ `synchronize` is `false` and stays `false` — schema changes go
 * through reviewed migrations, never through the ORM.
 */
const DatabaseConfig: PostgresDataSourceOptions = {
  type: "postgres",
  host: ENV.DB_HOST,
  port: Number.parseInt(ENV.DB_PORT),
  username: ENV.DB_USERNAME,
  password: ENV.DB_PASSWORD,
  database: ENV.DB_DATABASE,
  ssl: ENV.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [sourcePath + "/database/entities/**/*{.ts,.js}"],
  migrations: [sourcePath + "/database/migrations/**/*{.ts,.js}"],
  poolSize: Number.parseInt(ENV.DB_MAX_POOL ?? "20"),
  migrationsTableName: "migrations",
  synchronize: false,
  logging: ENV.APP_ENV != AppEnvironment.PRODUCTION,
};

export default DatabaseConfig;
