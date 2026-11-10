import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import {
  TABLE_BAND_MEMBERSHIP_REQUESTS,
  TABLE_BAND_OPEN_ROLES,
  TABLE_BANDS,
  TABLE_INSTRUMENTS,
  TABLE_USERS,
} from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateBandMembershipRequestsTable1794960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_MEMBERSHIP_REQUESTS,
        columns: [
          primaryIdColumn,
          { name: "band_id", type: "int", isNullable: false },
          { name: "user_id", type: "int", isNullable: false },
          { name: "type", type: "smallint", isNullable: false },
          { name: "open_role_id", type: "int", isNullable: true },
          { name: "instrument_id", type: "int", isNullable: true },
          { name: "message", type: "varchar", length: "1000", isNullable: true },
          { name: "status", type: "smallint", isNullable: false, default: 1 },
          { name: "sent_by_user_id", type: "int", isNullable: false },
          { name: "responded_by_user_id", type: "int", isNullable: true },
          { name: "responded_at", type: "timestamptz", isNullable: true },
          { name: "expires_at", type: "timestamptz", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_MEMBERSHIP_REQUESTS, [
      new TableIndex({
        name: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_uq_band_id_user_id_pending`,
        columnNames: ["band_id", "user_id"],
        isUnique: true,
        where: "status = 1 AND deleted_at IS NULL",
      }),
      new TableIndex({ name: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_idx_user_id_status`, columnNames: ["user_id", "status"] }),
      new TableIndex({ name: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_idx_band_id_status`, columnNames: ["band_id", "status"] }),
    ]);

    const fk = (column: string, table: string): TableForeignKey =>
      new TableForeignKey({
        name: `${TABLE_BAND_MEMBERSHIP_REQUESTS}_fk_${column}`,
        columnNames: [column],
        referencedTableName: table,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      });

    await queryRunner.createForeignKeys(TABLE_BAND_MEMBERSHIP_REQUESTS, [
      fk("band_id", TABLE_BANDS),
      fk("user_id", TABLE_USERS),
      fk("open_role_id", TABLE_BAND_OPEN_ROLES),
      fk("instrument_id", TABLE_INSTRUMENTS),
      fk("sent_by_user_id", TABLE_USERS),
      fk("responded_by_user_id", TABLE_USERS),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_MEMBERSHIP_REQUESTS, true, true, true);
  }
}
