import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_BAND_MEMBER_INTERESTS, TABLE_BAND_MEMBERS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandMemberInterestsTable1795305600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_MEMBER_INTERESTS,
        columns: [
          primaryIdColumn,
          { name: "band_member_id", type: "int", isNullable: false },
          { name: "interest", type: "smallint", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_MEMBER_INTERESTS, [
      new TableIndex({
        name: `${TABLE_BAND_MEMBER_INTERESTS}_uq_band_member_id_interest`,
        columnNames: ["band_member_id", "interest"],
        isUnique: true,
        where: "deleted_at IS NULL",
      }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BAND_MEMBER_INTERESTS, [
      new TableForeignKey({
        name: `${TABLE_BAND_MEMBER_INTERESTS}_fk_band_member_id`,
        columnNames: ["band_member_id"],
        referencedTableName: TABLE_BAND_MEMBERS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_MEMBER_INTERESTS, true, true, true);
  }
}
