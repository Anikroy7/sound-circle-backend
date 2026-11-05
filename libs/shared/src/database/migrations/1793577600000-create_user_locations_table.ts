import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_LOCATIONS, TABLE_USER_LOCATIONS, TABLE_USERS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateUserLocationsTable1793577600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_USER_LOCATIONS,
        columns: [
          primaryIdColumn,
          { name: "user_id", type: "int", isNullable: false },
          { name: "location_id", type: "int", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_USER_LOCATIONS, [
      // Partial — removing a pick and picking it again later is allowed.
      new TableIndex({
        name: `${TABLE_USER_LOCATIONS}_uq_user_id_location_id`,
        columnNames: ["user_id", "location_id"],
        isUnique: true,
        where: "deleted_at IS NULL",
      }),
      // Matching starts here (schema-design §5.4).
      new TableIndex({ name: `${TABLE_USER_LOCATIONS}_idx_location_id`, columnNames: ["location_id"] }),
    ]);

    await queryRunner.createForeignKeys(TABLE_USER_LOCATIONS, [
      new TableForeignKey({
        name: `${TABLE_USER_LOCATIONS}_fk_user_id`,
        columnNames: ["user_id"],
        referencedTableName: TABLE_USERS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
      new TableForeignKey({
        name: `${TABLE_USER_LOCATIONS}_fk_location_id`,
        columnNames: ["location_id"],
        referencedTableName: TABLE_LOCATIONS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_USER_LOCATIONS, true, true, true);
  }
}
