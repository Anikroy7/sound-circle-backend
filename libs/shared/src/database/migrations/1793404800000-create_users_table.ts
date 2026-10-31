import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { TABLE_USERS } from "@soundcircle/shared/utils/util/database.table";
import { ContactVisibility } from "@soundcircle/shared/database/entities/identity/enums/identity.enum";
import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateUsersTable1793404800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_USERS,
        columns: [
          primaryIdColumn,
          { name: "name", type: "varchar", length: "100", isNullable: false },
          { name: "email", type: "varchar", length: "255", isNullable: true },
          { name: "phone", type: "varchar", length: "20", isNullable: true },
          { name: "password_hash", type: "varchar", length: "255", isNullable: true },
          { name: "google_id", type: "varchar", length: "64", isNullable: true },
          { name: "email_verified_at", type: "timestamptz", isNullable: true },
          { name: "phone_verified_at", type: "timestamptz", isNullable: true },
          { name: "email_visibility", type: "smallint", isNullable: false, default: ContactVisibility.ONLY_ME },
          { name: "phone_visibility", type: "smallint", isNullable: false, default: ContactVisibility.ONLY_ME },
          { name: "last_login_at", type: "timestamptz", isNullable: true },
          ...commonColumns,
        ],
        checks: [{ name: `${TABLE_USERS}_ck_email_or_phone`, expression: "email IS NOT NULL OR phone IS NOT NULL" }],
      }),
      true,
    );

    // Partial — a soft-deleted account frees its email / phone for a new signup.
    await queryRunner.createIndices(TABLE_USERS, [
      new TableIndex({ name: `${TABLE_USERS}_uq_email`, columnNames: ["email"], isUnique: true, where: "deleted_at IS NULL" }),
      new TableIndex({ name: `${TABLE_USERS}_uq_phone`, columnNames: ["phone"], isUnique: true, where: "deleted_at IS NULL" }),
      new TableIndex({ name: `${TABLE_USERS}_uq_google_id`, columnNames: ["google_id"], isUnique: true, where: "deleted_at IS NULL" }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_USERS, true, true, true);
  }
}
