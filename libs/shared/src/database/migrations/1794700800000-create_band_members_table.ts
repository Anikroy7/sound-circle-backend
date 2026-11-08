import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_BAND_MEMBERS, TABLE_BANDS, TABLE_USERS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandMembersTable1794700800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_MEMBERS,
        columns: [
          primaryIdColumn,
          { name: "band_id", type: "int", isNullable: false },
          { name: "user_id", type: "int", isNullable: true },
          { name: "role", type: "smallint", isNullable: false },
          { name: "name", type: "varchar", length: "100", isNullable: true },
          { name: "position", type: "varchar", length: "120", isNullable: true },
          { name: "photo_public_id", type: "varchar", length: "255", isNullable: true },
          { name: "photo_url", type: "varchar", length: "500", isNullable: true },
          ...commonColumns,
        ],
        checks: [
          { name: `${TABLE_BAND_MEMBERS}_ck_user_or_name`, expression: "(user_id IS NULL) = (name IS NOT NULL)" },
          { name: `${TABLE_BAND_MEMBERS}_ck_owner_is_user`, expression: "role <> 1 OR user_id IS NOT NULL" },
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_MEMBERS, [
      new TableIndex({
        name: `${TABLE_BAND_MEMBERS}_uq_band_id_user_id`,
        columnNames: ["band_id", "user_id"],
        isUnique: true,
        where: "user_id IS NOT NULL AND deleted_at IS NULL",
      }),
      new TableIndex({
        name: `${TABLE_BAND_MEMBERS}_uq_band_id_owner`,
        columnNames: ["band_id"],
        isUnique: true,
        where: "role = 1 AND deleted_at IS NULL",
      }),
      new TableIndex({ name: `${TABLE_BAND_MEMBERS}_idx_user_id`, columnNames: ["user_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BAND_MEMBERS, [
      new TableForeignKey({
        name: `${TABLE_BAND_MEMBERS}_fk_band_id`,
        columnNames: ["band_id"],
        referencedTableName: TABLE_BANDS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_BAND_MEMBERS}_fk_user_id`,
        columnNames: ["user_id"],
        referencedTableName: TABLE_USERS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_MEMBERS, true, true, true);
  }
}
