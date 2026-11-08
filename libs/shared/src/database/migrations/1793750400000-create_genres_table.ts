import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_GENRES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateGenresTable1793750400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_GENRES,
        columns: [
          primaryIdColumn,
          { name: "name", type: "varchar", length: "60", isNullable: false },
          { name: "sort_order", type: "smallint", isNullable: false, default: 0 },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_GENRES, [
      new TableIndex({ name: `${TABLE_GENRES}_uq_name`, columnNames: ["name"], isUnique: true, where: "deleted_at IS NULL" }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_GENRES, true, true, true);
  }
}
