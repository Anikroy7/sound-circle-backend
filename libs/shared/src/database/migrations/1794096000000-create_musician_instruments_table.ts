import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_INSTRUMENTS, TABLE_MUSICIAN_INSTRUMENTS, TABLE_MUSICIAN_PROFILES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateMusicianInstrumentsTable1794096000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_MUSICIAN_INSTRUMENTS,
        columns: [
          primaryIdColumn,
          { name: "musician_profile_id", type: "int", isNullable: false },
          { name: "instrument_id", type: "int", isNullable: false },
          { name: "skill_level", type: "smallint", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_MUSICIAN_INSTRUMENTS, [
      new TableIndex({
        name: `${TABLE_MUSICIAN_INSTRUMENTS}_uq_musician_profile_id_instrument_id`,
        columnNames: ["musician_profile_id", "instrument_id"],
        isUnique: true,
        where: "deleted_at IS NULL",
      }),
      new TableIndex({ name: `${TABLE_MUSICIAN_INSTRUMENTS}_idx_instrument_id`, columnNames: ["instrument_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_MUSICIAN_INSTRUMENTS, [
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_INSTRUMENTS}_fk_musician_profile_id`,
        columnNames: ["musician_profile_id"],
        referencedTableName: TABLE_MUSICIAN_PROFILES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_INSTRUMENTS}_fk_instrument_id`,
        columnNames: ["instrument_id"],
        referencedTableName: TABLE_INSTRUMENTS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_MUSICIAN_INSTRUMENTS, true, true, true);
  }
}
