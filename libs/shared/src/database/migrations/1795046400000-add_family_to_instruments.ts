import { TABLE_INSTRUMENTS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/** The band section an instrument plays in (`InstrumentFamily`). `yarn seed:run` fills it for the seeded catalogue. */
export class AddFamilyToInstruments1795046400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(TABLE_INSTRUMENTS, new TableColumn({ name: "family", type: "smallint", isNullable: true }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_INSTRUMENTS, "family");
  }
}
