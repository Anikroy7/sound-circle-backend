import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_BAND_MEMBER_GENRES, TABLE_BAND_MEMBERS, TABLE_GENRES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandMemberGenresTable1795219200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_MEMBER_GENRES,
        columns: [
          primaryIdColumn,
          { name: "band_member_id", type: "int", isNullable: false },
          { name: "genre_id", type: "int", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_MEMBER_GENRES, [
      new TableIndex({
        name: `${TABLE_BAND_MEMBER_GENRES}_uq_band_member_id_genre_id`,
        columnNames: ["band_member_id", "genre_id"],
        isUnique: true,
        where: "deleted_at IS NULL",
      }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BAND_MEMBER_GENRES, [
      new TableForeignKey({
        name: `${TABLE_BAND_MEMBER_GENRES}_fk_band_member_id`,
        columnNames: ["band_member_id"],
        referencedTableName: TABLE_BAND_MEMBERS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_BAND_MEMBER_GENRES}_fk_genre_id`,
        columnNames: ["genre_id"],
        referencedTableName: TABLE_GENRES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_MEMBER_GENRES, true, true, true);
  }
}
