import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_LOCATIONS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateLocationsTable1793491200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ⚠ Needs a PostGIS-enabled server (infra/docker uses postgis/postgis). `down()` leaves the extension: other tables may use it.
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS postgis");

    await queryRunner.createTable(
      new Table({
        name: TABLE_LOCATIONS,
        columns: [
          primaryIdColumn,
          { name: "parent_id", type: "int", isNullable: true },
          { name: "level", type: "smallint", isNullable: false },
          { name: "type", type: "smallint", isNullable: false },
          { name: "name", type: "varchar", length: "100", isNullable: false },
          { name: "name_bn", type: "varchar", length: "100", isNullable: true },
          { name: "center_point", type: "geography", spatialFeatureType: "Point", srid: 4326, isNullable: true },
          { name: "division_id", type: "int", isNullable: false },
          { name: "district_id", type: "int", isNullable: true },
          { name: "subdistrict_id", type: "int", isNullable: true },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_LOCATIONS, [
      new TableIndex({ name: `${TABLE_LOCATIONS}_idx_parent_id`, columnNames: ["parent_id"] }),
      // GiST — what `ST_DWithin` uses for the "near" search.
      new TableIndex({ name: `${TABLE_LOCATIONS}_idx_center_point`, columnNames: ["center_point"], isSpatial: true }),
    ]);

    // Self-references. A division row points its `division_id` at itself; Postgres checks that at the end of the statement, so it inserts fine.
    await queryRunner.createForeignKeys(
      TABLE_LOCATIONS,
      ["parent_id", "division_id", "district_id", "subdistrict_id"].map(
        (column) =>
          new TableForeignKey({
            name: `${TABLE_LOCATIONS}_fk_${column}`,
            columnNames: [column],
            referencedTableName: TABLE_LOCATIONS,
            referencedColumnNames: ["id"],
            onDelete: "NO ACTION",
          }),
      ),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_LOCATIONS, true, true, true);
  }
}
