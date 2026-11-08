import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_GENRES, TABLE_MUSICIAN_GENRES, TABLE_MUSICIAN_PROFILES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateMusicianGenresTable1794009600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_MUSICIAN_GENRES,
        columns: [
          primaryIdColumn,
          { name: "musician_profile_id", type: "int", isNullable: false },
          { name: "genre_id", type: "int", isNullable: false },
          { name: "relation", type: "smallint", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_MUSICIAN_GENRES, [
      new TableIndex({
        name: `${TABLE_MUSICIAN_GENRES}_uq_musician_profile_id_genre_id_relation`,
        columnNames: ["musician_profile_id", "genre_id", "relation"],
        isUnique: true,
        where: "deleted_at IS NULL",
      }),
      new TableIndex({ name: `${TABLE_MUSICIAN_GENRES}_idx_genre_id`, columnNames: ["genre_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_MUSICIAN_GENRES, [
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_GENRES}_fk_musician_profile_id`,
        columnNames: ["musician_profile_id"],
        referencedTableName: TABLE_MUSICIAN_PROFILES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_MUSICIAN_GENRES}_fk_genre_id`,
        columnNames: ["genre_id"],
        referencedTableName: TABLE_GENRES,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_MUSICIAN_GENRES, true, true, true);
  }
}
