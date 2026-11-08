import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_PORTFOLIO_MEDIA } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreatePortfolioMediaTable1793836800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_PORTFOLIO_MEDIA,
        columns: [
          primaryIdColumn,
          { name: "owner_type", type: "smallint", isNullable: false },
          { name: "owner_id", type: "int", isNullable: false },
          { name: "media_type", type: "smallint", isNullable: false },
          { name: "file_name", type: "varchar", length: "255", isNullable: true },
          { name: "public_id", type: "varchar", length: "255", isNullable: false },
          { name: "secure_url", type: "text", isNullable: false },
          { name: "format", type: "varchar", length: "20", isNullable: false },
          { name: "file_size", type: "int", isNullable: false },
          { name: "duration_seconds", type: "int", isNullable: true },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_PORTFOLIO_MEDIA, [
      new TableIndex({ name: `${TABLE_PORTFOLIO_MEDIA}_uq_public_id`, columnNames: ["public_id"], isUnique: true, where: "deleted_at IS NULL" }),
      // ⚠ owner_id is polymorphic (users / bands / musician_band_experiences), so it has no foreign key.
      new TableIndex({ name: `${TABLE_PORTFOLIO_MEDIA}_idx_owner_type_owner_id`, columnNames: ["owner_type", "owner_id"] }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_PORTFOLIO_MEDIA, true, true, true);
  }
}
