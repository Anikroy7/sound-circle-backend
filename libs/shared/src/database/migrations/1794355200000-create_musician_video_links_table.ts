import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_MUSICIAN_BAND_EXPERIENCES, TABLE_MUSICIAN_PROFILES, TABLE_MUSICIAN_VIDEO_LINKS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateMusicianVideoLinksTable1794355200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_MUSICIAN_VIDEO_LINKS,
        columns: [
          primaryIdColumn,
          { name: "musician_profile_id", type: "int", isNullable: false },
          { name: "band_experience_id", type: "int", isNullable: true },
          { name: "provider", type: "smallint", isNullable: false },
          { name: "external_video_id", type: "varchar", length: "64", isNullable: false },
          { name: "url", type: "varchar", length: "512", isNullable: false },
          { name: "sort_order", type: "smallint", isNullable: false, default: 0 },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_MUSICIAN_VIDEO_LINKS, [
      new TableIndex({ name: `${TABLE_MUSICIAN_VIDEO_LINKS}_idx_musician_profile_id`, columnNames: ["musician_profile_id"] }),
      new TableIndex({ name: `${TABLE_MUSICIAN_VIDEO_LINKS}_idx_band_experience_id`, columnNames: ["band_experience_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_MUSICIAN_VIDEO_LINKS, [
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_VIDEO_LINKS}_fk_musician_profile_id`,
        columnNames: ["musician_profile_id"],
        referencedTableName: TABLE_MUSICIAN_PROFILES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_VIDEO_LINKS}_fk_band_experience_id`,
        columnNames: ["band_experience_id"],
        referencedTableName: TABLE_MUSICIAN_BAND_EXPERIENCES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_MUSICIAN_VIDEO_LINKS, true, true, true);
  }
}
