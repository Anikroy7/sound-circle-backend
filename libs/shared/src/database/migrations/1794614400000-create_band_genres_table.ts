import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_BAND_GENRES, TABLE_BANDS, TABLE_GENRES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandGenresTable1794614400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_GENRES,
        columns: [
          primaryIdColumn,
          { name: "band_id", type: "int", isNullable: false },
          { name: "genre_id", type: "int", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_GENRES, [
      new TableIndex({
        name: `${TABLE_BAND_GENRES}_uq_band_id_genre_id`,
        columnNames: ["band_id", "genre_id"],
        isUnique: true,
        where: "deleted_at IS NULL",
      }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BAND_GENRES, [
      new TableForeignKey({
        name: `${TABLE_BAND_GENRES}_fk_band_id`,
        columnNames: ["band_id"],
        referencedTableName: TABLE_BANDS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_BAND_GENRES}_fk_genre_id`,
        columnNames: ["genre_id"],
        referencedTableName: TABLE_GENRES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_GENRES, true, true, true);
  }
}
