import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_BAND_OPEN_ROLES, TABLE_BANDS, TABLE_INSTRUMENTS, TABLE_USERS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandOpenRolesTable1794873600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_OPEN_ROLES,
        columns: [
          primaryIdColumn,
          { name: "band_id", type: "int", isNullable: false },
          { name: "instrument_id", type: "int", isNullable: false },
          { name: "description", type: "varchar", length: "500", isNullable: true },
          { name: "status", type: "smallint", isNullable: false, default: 1 },
          { name: "filled_by_user_id", type: "int", isNullable: true },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_OPEN_ROLES, [
      new TableIndex({ name: `${TABLE_BAND_OPEN_ROLES}_idx_band_id_status`, columnNames: ["band_id", "status"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BAND_OPEN_ROLES, [
      new TableForeignKey({
        name: `${TABLE_BAND_OPEN_ROLES}_fk_band_id`,
        columnNames: ["band_id"],
        referencedTableName: TABLE_BANDS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_BAND_OPEN_ROLES}_fk_instrument_id`,
        columnNames: ["instrument_id"],
        referencedTableName: TABLE_INSTRUMENTS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_BAND_OPEN_ROLES}_fk_filled_by_user_id`,
        columnNames: ["filled_by_user_id"],
        referencedTableName: TABLE_USERS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_OPEN_ROLES, true, true, true);
  }
}
