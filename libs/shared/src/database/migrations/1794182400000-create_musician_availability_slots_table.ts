import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_MUSICIAN_AVAILABILITY_SLOTS, TABLE_MUSICIAN_PROFILES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateMusicianAvailabilitySlotsTable1794182400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_MUSICIAN_AVAILABILITY_SLOTS,
        columns: [
          primaryIdColumn,
          { name: "musician_profile_id", type: "int", isNullable: false },
          { name: "day_of_week", type: "smallint", isNullable: true },
          { name: "start_time", type: "time", isNullable: true },
          { name: "end_time", type: "time", isNullable: true },
          ...commonColumns,
        ],
        checks: [
          { name: `${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_ck_time_range`, expression: "(start_time IS NULL) = (end_time IS NULL)" },
          { name: `${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_ck_time_not_empty`, expression: "start_time IS NULL OR start_time <> end_time" },
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_MUSICIAN_AVAILABILITY_SLOTS, [
      new TableIndex({ name: `${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_idx_musician_profile_id`, columnNames: ["musician_profile_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_MUSICIAN_AVAILABILITY_SLOTS, [
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_AVAILABILITY_SLOTS}_fk_musician_profile_id`,
        columnNames: ["musician_profile_id"],
        referencedTableName: TABLE_MUSICIAN_PROFILES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_MUSICIAN_AVAILABILITY_SLOTS, true, true, true);
  }
}
