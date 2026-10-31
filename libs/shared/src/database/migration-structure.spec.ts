import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { DataSource, Entity } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";

/**
 * The migration set, checked against the entities **without a database** — the drift
 * `migration:generate` would otherwise find only on someone's fresh database.
 *
 * Every `up()` runs against a fake `QueryRunner` that records what it was asked to create,
 * and the recording is compared with the metadata TypeORM builds from the entities — the
 * same metadata `migration:generate` diffs against.
 *
 * ⚠ This file must NOT live in `database/migrations/` — the datasource globs that folder,
 * so a spec there would be loaded as a migration.
 */

const MIGRATIONS = path.join(__dirname, "migrations");
const ENTITIES = path.join(__dirname, "entities");

/**
 * Indexes and constraints TypeORM has no syntax for, created with raw SQL (coding-standards
 * §2.1). ⚠ `migration:generate` proposes dropping every one of them.
 */
const RAW_ONLY_INDEXES: string[] = [];

type Recording = {
  tables: Record<string, any>;
  indices: Record<string, any[]>;
  foreignKeys: Record<string, any[]>;
  raw: string[];
  /** Table creation order, so a foreign key can be checked against what already exists. */
  order: string[];
};

/**
 * ⚠ Most migrations create a table. Once a table has run on a shared database its file is
 * never edited — a new column arrives as its own `add_`/`alter_` migration instead. The fake
 * runner below therefore replays `addColumn` / `createForeignKey` onto the table an earlier
 * file recorded, so the entity-vs-migration comparison still sees one complete table.
 */
const ALTER_FILE = /^\d{13}-(add|alter)_[a-z0-9_]+\.ts$/;

@Entity("abstract_probe")
class AbstractProbeEntity extends AbstractEntity {}

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

const migrationFiles = fs
  .readdirSync(MIGRATIONS)
  .filter((file) => file.endsWith(".ts"))
  .sort();

/* Metadata only — `buildMetadatas()` does not open a connection. */
const buildMetadata = async (entities: Function[]): Promise<Map<string, any>> => {
  const dataSource = new DataSource({ type: "postgres", entities: entities as any, synchronize: false });
  await (dataSource as any).buildMetadatas();
  return new Map(dataSource.entityMetadatas.map((entity) => [entity.tableName, entity]));
};

let recording: Recording;
let metadata: Map<string, any>;
/** file → the tables that file creates, for the ordering assertions. */
let createdBy: Map<string, string[]>;
/** file → its migration class, loaded once. */
let migrationClasses: Map<string, any>;

beforeAll(async () => {
  const modules = await Promise.all(
    walk(ENTITIES)
      .filter((file) => file.endsWith(".entity.ts"))
      .map((file) => import(file)),
  );
  const entities = modules
    .map((module) => Object.values(module).find((exported: any) => typeof exported === "function" && /Entity$/.test(exported.name)))
    .filter(Boolean) as Function[];

  metadata = await buildMetadata(entities);

  recording = { tables: {}, indices: {}, foreignKeys: {}, raw: [], order: [] };
  createdBy = new Map();

  /** The migration file currently being replayed, stamped onto everything it records. */
  let currentFile = "";
  const stamp = (items: any[]): any[] => items.map((item) => Object.assign(item, { __file: currentFile }));

  const requireTable = (table: string, verb: string): any => {
    if (!recording.tables[table]) throw new Error(`${currentFile}: ${verb} on "${table}", which no earlier migration creates`);
    return recording.tables[table];
  };

  const queryRunner: any = {
    createTable: async (table: any) => {
      recording.tables[table.name] = table;
      recording.order.push(table.name);
    },
    createIndices: async (table: string, indices: any[]) => {
      recording.indices[table] = (recording.indices[table] || []).concat(stamp(indices));
    },
    createIndex: async (table: string, index: any) => {
      recording.indices[table] = (recording.indices[table] || []).concat(stamp([index]));
    },
    createForeignKeys: async (table: string, keys: any[]) => {
      recording.foreignKeys[table] = (recording.foreignKeys[table] || []).concat(stamp(keys));
    },
    createForeignKey: async (table: string, key: any) => {
      recording.foreignKeys[table] = (recording.foreignKeys[table] || []).concat(stamp([key]));
    },
    /* The ALTER verbs. A column added later is indistinguishable from one created with the table. */
    addColumn: async (table: string, column: any) => {
      requireTable(table, "addColumn").columns.push(column);
    },
    addColumns: async (table: string, columns: any[]) => {
      requireTable(table, "addColumns").columns.push(...columns);
    },
    query: async (sql: string) => {
      recording.raw.push(sql);
    },
  };

  migrationClasses = new Map();
  for (const file of migrationFiles) {
    migrationClasses.set(file, Object.values(await import(path.join(MIGRATIONS, file)))[0]);
  }

  for (const file of migrationFiles) {
    currentFile = file;
    const before = recording.order.length;
    await new (migrationClasses.get(file))().up(queryRunner);
    createdBy.set(file, recording.order.slice(before));
  }
  currentFile = "";
});

/**
 * `commonColumns` and `AbstractEntity` are one definition in two places (coding-standards §9).
 * Checked on a probe entity, so it holds before any real table exists.
 */
describe("commonColumns matches AbstractEntity", () => {
  let probe: any;

  beforeAll(async () => {
    probe = (await buildMetadata([AbstractProbeEntity])).get("abstract_probe");
  });

  it("declares the same columns, in the same order", () => {
    const inEntity = probe.columns.map((column: any) => column.databaseName);
    const inMigration = [primaryIdColumn, ...commonColumns].map((column) => column.name);

    expect(inMigration).toEqual(inEntity);
  });

  it("agrees on type, nullability and length", () => {
    const declared = new Map([primaryIdColumn, ...commonColumns].map((column) => [column.name, column]));
    const problems: string[] = [];

    for (const column of probe.columns) {
      const migration: any = declared.get(column.databaseName);
      if (!migration) continue;

      if (String(column.type) !== migration.type) problems.push(`${column.databaseName}: type entity=${column.type} migration=${migration.type}`);
      if (!!column.isNullable !== !!migration.isNullable) problems.push(`${column.databaseName}: nullable differs`);
      if (String(column.length || "") !== String(migration.length || "")) problems.push(`${column.databaseName}: length differs`);
    }

    expect(problems).toEqual([]);
  });

  it("carries all three actor/IP pairs, including deleted_ip", () => {
    const names = commonColumns.map((column) => column.name);

    ["created_by", "updated_by", "deleted_by", "created_ip", "updated_ip", "deleted_ip"].forEach((name) => expect(names).toContain(name));
  });
});

describe("file and class naming", () => {
  it("names every file <timestamp>-create_<table>_table.ts, or <timestamp>-add_<what>_to_<table>.ts", () => {
    const offenders = migrationFiles.filter((file) => !/^\d{13}-create_[a-z0-9_]+(_table)?\.ts$/.test(file) && !ALTER_FILE.test(file));

    expect(offenders).toEqual([]);
  });

  /* An altering migration must say so in its name, or a reader expects a new table and finds none. */
  it("creates a table in every file not named as an alteration", () => {
    const offenders = migrationFiles.filter((file) => (createdBy.get(file) || []).length === 0 && !ALTER_FILE.test(file));

    expect(offenders).toEqual([]);
  });

  it("ends every class name with its own timestamp", () => {
    const offenders = migrationFiles.filter((file) => !migrationClasses.get(file)?.name?.endsWith(file.split("-")[0]));

    expect(offenders).toEqual([]);
  });

  /* Two migrations sharing a timestamp run in an order TypeORM does not define. */
  it("issues each timestamp once", () => {
    const timestamps = migrationFiles.map((file) => file.split("-")[0]);

    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it("gives every migration a down()", () => {
    const offenders = migrationFiles.filter((file) => typeof new (migrationClasses.get(file))().down !== "function");

    expect(offenders).toEqual([]);
  });
});

describe("one migration per table", () => {
  it("creates every entity's table", () => {
    const missing = [...metadata.keys()].filter((table) => !recording.tables[table]);

    expect(missing).toEqual([]);
  });

  it("creates no table that no entity declares", () => {
    const orphans = Object.keys(recording.tables).filter((table) => !metadata.has(table));

    expect(orphans).toEqual([]);
  });

  it("creates at most one table per file", () => {
    const offenders = [...createdBy.entries()].filter(([, tables]) => tables.length > 1).map(([file]) => file);

    expect(offenders).toEqual([]);
  });
});

describe("columns match the entity", () => {
  it("has the same column set on both sides", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const inMigration = new Set(recording.tables[table].columns.map((column: any) => column.name));
      const inEntity = new Set(entity.columns.map((column: any) => column.databaseName));

      [...inEntity].filter((name) => !inMigration.has(name)).forEach((name) => problems.push(`${table}.${name} missing from the migration`));
      [...inMigration].filter((name) => !inEntity.has(name)).forEach((name) => problems.push(`${table}.${name} missing from the entity`));
    }

    expect(problems).toEqual([]);
  });

  /* A column the migration makes NOT NULL and the entity thinks is optional fails at the first insert. */
  it("agrees on nullability and length", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const columns = new Map(recording.tables[table].columns.map((column: any) => [column.name, column]));

      for (const column of entity.columns) {
        const declared: any = columns.get(column.databaseName);
        if (!declared) continue;

        if (!!column.isNullable !== !!declared.isNullable) {
          problems.push(`${table}.${column.databaseName}: nullable entity=${!!column.isNullable} migration=${!!declared.isNullable}`);
        }
        if (column.length && String(column.length) !== String(declared.length || "")) {
          problems.push(`${table}.${column.databaseName}: length entity=${column.length} migration=${declared.length}`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  /* timestamptz on every table (schema-design §1). */
  it("never creates a zone-less timestamp column", () => {
    const offenders: string[] = [];

    for (const [table, created] of Object.entries(recording.tables)) {
      created.columns.filter((column: any) => column.type === "timestamp").forEach((column: any) => offenders.push(`${table}.${column.name}`));
    }

    expect(offenders).toEqual([]);
  });
});

describe("indexes travel with their table", () => {
  it("creates every index the entity declares, with the same name, columns, uniqueness and predicate", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const created = new Map((recording.indices[table] || []).map((index: any) => [index.name, index]));

      for (const index of entity.indices) {
        const declared: any = created.get(index.name);
        if (!declared) {
          problems.push(`${table}: "${index.name}" is on the entity, not in the migration`);
          continue;
        }

        const entityColumns = index.columns.map((column: any) => column.databaseName).join(",");
        if (entityColumns !== declared.columnNames.join(",")) {
          problems.push(`${table}.${index.name}: columns entity=[${entityColumns}] migration=[${declared.columnNames}]`);
        }
        if (!!index.isUnique !== !!declared.isUnique) problems.push(`${table}.${index.name}: uniqueness differs`);
        /* A partial unique that loses its WHERE enforces nothing over a nullable column, or too much over a revoked one. */
        if ((index.where || "") !== (declared.where || "")) {
          problems.push(`${table}.${index.name}: where entity="${index.where}" migration="${declared.where}"`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  /** The other direction: an index no entity declares is one `migration:generate` proposes dropping. */
  it("declares every created index on its entity, except the raw-SQL ones", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const declared = new Set(entity.indices.map((index: any) => index.name));

      for (const index of recording.indices[table] || []) {
        if (!declared.has(index.name) && !RAW_ONLY_INDEXES.includes(index.name)) {
          problems.push(`${table}: "${index.name}" is in the migration, not on the entity`);
        }
      }
    }

    expect(problems).toEqual([]);
  });
});

describe("foreign keys travel with their table", () => {
  it("creates every foreign key the entity declares, with the same name, target and onDelete", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const created = new Map((recording.foreignKeys[table] || []).map((key: any) => [key.name, key]));

      for (const key of entity.foreignKeys) {
        const declared: any = created.get(key.name);
        if (!declared) {
          problems.push(`${table}: "${key.name}" is on the entity, not in the migration`);
          continue;
        }
        if (key.referencedEntityMetadata.tableName !== declared.referencedTableName) {
          problems.push(`${table}.${key.name}: target entity=${key.referencedEntityMetadata.tableName} migration=${declared.referencedTableName}`);
        }
        if ((key.onDelete || "NO ACTION") !== (declared.onDelete || "NO ACTION")) {
          problems.push(`${table}.${key.name}: onDelete entity=${key.onDelete} migration=${declared.onDelete}`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("creates no foreign key the entity does not declare", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const declared = new Set(entity.foreignKeys.map((key: any) => key.name));

      for (const key of recording.foreignKeys[table] || []) {
        if (!declared.has(key.name)) problems.push(`${table}: "${key.name}" is in the migration, not on the entity`);
      }
    }

    expect(problems).toEqual([]);
  });

  /* A foreign key to a table a *later* migration creates fails only on a fresh database. */
  it("references only tables an earlier migration has already created", () => {
    const problems: string[] = [];
    const existing = new Set<string>();
    /* Every foreign key, grouped by the file that issued it — which is not its table's file when an ALTER added it. */
    const byFile = new Map<string, any[]>();

    for (const keys of Object.values(recording.foreignKeys)) {
      for (const key of keys) {
        byFile.set(key.__file, (byFile.get(key.__file) || []).concat([key]));
      }
    }

    for (const file of migrationFiles) {
      /* A table created in this file can be referenced by a foreign key created in the same file. */
      (createdBy.get(file) || []).forEach((table) => existing.add(table));

      for (const key of byFile.get(file) || []) {
        if (!existing.has(key.referencedTableName)) {
          problems.push(`${file}: ${key.name} → "${key.referencedTableName}", which no earlier migration creates`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("names every index and foreign key after its own table", () => {
    const offenders: string[] = [];

    for (const table of Object.keys(recording.tables)) {
      (recording.indices[table] || []).forEach((index: any) => {
        if (!index.name.startsWith(`${table}_`)) offenders.push(index.name);
      });
      (recording.foreignKeys[table] || []).forEach((key: any) => {
        if (!key.name.startsWith(`${table}_fk_`)) offenders.push(key.name);
      });
    }

    expect(offenders).toEqual([]);
  });
});

/**
 * `@Check` is metadata TypeORM's own diff sees (coding-standards §2.1) — unlike a partial
 * exclusion constraint or a GiST index, a check constraint one side drops is real drift,
 * not a false positive from `migration:generate`.
 */
describe("check constraints travel with their table", () => {
  it("creates every check constraint the entity declares, with the same name and expression", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const created = new Map((recording.tables[table].checks || []).map((check: any) => [check.name, check]));

      for (const check of entity.checks) {
        const declared: any = created.get(check.name);
        if (!declared) {
          problems.push(`${table}: "${check.name}" is on the entity, not in the migration`);
          continue;
        }
        if (declared.expression !== check.expression) {
          problems.push(`${table}.${check.name}: expression entity="${check.expression}" migration="${declared.expression}"`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("creates no check constraint the entity does not declare", () => {
    const problems: string[] = [];

    for (const [table, entity] of metadata) {
      const declared = new Set(entity.checks.map((check: any) => check.name));

      for (const check of recording.tables[table].checks || []) {
        if (!declared.has(check.name)) problems.push(`${table}: "${check.name}" is in the migration, not on the entity`);
      }
    }

    expect(problems).toEqual([]);
  });

  it("names every check constraint after its own table", () => {
    const offenders: string[] = [];

    for (const table of Object.keys(recording.tables)) {
      (recording.tables[table].checks || []).forEach((check: any) => {
        if (!check.name.startsWith(`${table}_ck_`)) offenders.push(check.name);
      });
    }

    expect(offenders).toEqual([]);
  });
});
