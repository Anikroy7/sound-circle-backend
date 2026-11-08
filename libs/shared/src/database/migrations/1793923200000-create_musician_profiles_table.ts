import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_MUSICIAN_PROFILES, TABLE_USERS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateMusicianProfilesTable1793923200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_MUSICIAN_PROFILES,
        columns: [
          primaryIdColumn,
          { name: "user_id", type: "int", isNullable: false },
          { name: "slug", type: "varchar", length: "120", isNullable: false },
          { name: "bio", type: "text", isNullable: true },
          { name: "band_interest", type: "smallint", isNullable: true },
          { name: "setup_step", type: "smallint", isNullable: false, default: 0 },
          { name: "profile_completion", type: "smallint", isNullable: false, default: 0 },
          { name: "is_discoverable", type: "boolean", isNullable: false, default: false },
          ...commonColumns,
        ],
        checks: [
          { name: `${TABLE_MUSICIAN_PROFILES}_ck_setup_step`, expression: "setup_step BETWEEN 0 AND 8" },
          { name: `${TABLE_MUSICIAN_PROFILES}_ck_profile_completion`, expression: "profile_completion BETWEEN 0 AND 100" },
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_MUSICIAN_PROFILES, [
      new TableIndex({ name: `${TABLE_MUSICIAN_PROFILES}_uq_user_id`, columnNames: ["user_id"], isUnique: true, where: "deleted_at IS NULL" }),
      new TableIndex({ name: `${TABLE_MUSICIAN_PROFILES}_uq_slug`, columnNames: ["slug"], isUnique: true, where: "deleted_at IS NULL" }),
    ]);

    await queryRunner.createForeignKeys(TABLE_MUSICIAN_PROFILES, [
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_PROFILES}_fk_user_id`,
        columnNames: ["user_id"],
        referencedTableName: TABLE_USERS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_MUSICIAN_PROFILES, true, true, true);
  }
}
