import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_BAND_VIDEO_LINKS, TABLE_BANDS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandVideoLinksTable1794787200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_VIDEO_LINKS,
        columns: [
          primaryIdColumn,
          { name: "band_id", type: "int", isNullable: false },
          { name: "provider", type: "smallint", isNullable: false },
          { name: "external_video_id", type: "varchar", length: "64", isNullable: false },
          { name: "url", type: "varchar", length: "512", isNullable: false },
          { name: "sort_order", type: "smallint", isNullable: false, default: 0 },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_VIDEO_LINKS, [
      new TableIndex({ name: `${TABLE_BAND_VIDEO_LINKS}_idx_band_id`, columnNames: ["band_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BAND_VIDEO_LINKS, [
      new TableForeignKey({
        name: `${TABLE_BAND_VIDEO_LINKS}_fk_band_id`,
        columnNames: ["band_id"],
        referencedTableName: TABLE_BANDS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_VIDEO_LINKS, true, true, true);
  }
}
