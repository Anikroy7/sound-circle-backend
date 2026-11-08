import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_MUSICIAN_BAND_EXPERIENCES, TABLE_MUSICIAN_PROFILES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateMusicianBandExperiencesTable1794268800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_MUSICIAN_BAND_EXPERIENCES,
        columns: [
          primaryIdColumn,
          { name: "musician_profile_id", type: "int", isNullable: false },
          { name: "band_name", type: "varchar", length: "100", isNullable: false },
          { name: "role", type: "varchar", length: "120", isNullable: false },
          { name: "is_current", type: "boolean", isNullable: false, default: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_MUSICIAN_BAND_EXPERIENCES, [
      new TableIndex({ name: `${TABLE_MUSICIAN_BAND_EXPERIENCES}_idx_musician_profile_id`, columnNames: ["musician_profile_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_MUSICIAN_BAND_EXPERIENCES, [
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_BAND_EXPERIENCES}_fk_musician_profile_id`,
        columnNames: ["musician_profile_id"],
        referencedTableName: TABLE_MUSICIAN_PROFILES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_MUSICIAN_BAND_EXPERIENCES, true, true, true);
  }
}
