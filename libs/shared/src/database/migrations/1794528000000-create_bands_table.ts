import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_BANDS, TABLE_LOCATIONS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandsTable1794528000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BANDS,
        columns: [
          primaryIdColumn,
          { name: "name", type: "varchar", length: "100", isNullable: false },
          { name: "slug", type: "varchar", length: "120", isNullable: true },
          { name: "logo_public_id", type: "varchar", length: "255", isNullable: true },
          { name: "logo_url", type: "varchar", length: "500", isNullable: true },
          { name: "bio", type: "text", isNullable: false },
          { name: "location_id", type: "int", isNullable: false },
          { name: "band_type", type: "smallint", isNullable: false },
          { name: "published_at", type: "timestamptz", isNullable: true },
          ...commonColumns,
        ],
        checks: [{ name: `${TABLE_BANDS}_ck_slug_when_published`, expression: "published_at IS NULL OR slug IS NOT NULL" }],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BANDS, [
      new TableIndex({ name: `${TABLE_BANDS}_uq_slug`, columnNames: ["slug"], isUnique: true, where: "deleted_at IS NULL" }),
      new TableIndex({ name: `${TABLE_BANDS}_idx_location_id`, columnNames: ["location_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BANDS, [
      new TableForeignKey({
        name: `${TABLE_BANDS}_fk_location_id`,
        columnNames: ["location_id"],
        referencedTableName: TABLE_LOCATIONS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BANDS, true, true, true);
  }
}
