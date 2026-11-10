import { TABLE_BAND_MEMBERS, TABLE_INSTRUMENTS } from "@soundcircle/shared/utils/util/database.table";
import { INSTRUMENT_ALIASES } from "@soundcircle/shared/utils/util/instrument-match.util";
import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

/**
 * A member's catalogue instrument (for the lineup), whether they've seen their welcome, and their
 * introduction. Existing members get an instrument from their free-text position where it is the
 * instrument's name or a known word for it — the rules `matchInstrument` applies to new members.
 */
export class AddIntroductionToBandMembers1795132800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(TABLE_BAND_MEMBERS, [
      new TableColumn({ name: "instrument_id", type: "int", isNullable: true }),
      new TableColumn({ name: "welcomed_at", type: "timestamptz", isNullable: true }),
      new TableColumn({ name: "intro", type: "varchar", length: "500", isNullable: true }),
      new TableColumn({ name: "introduced_at", type: "timestamptz", isNullable: true }),
    ]);

    await queryRunner.createForeignKey(
      TABLE_BAND_MEMBERS,
      new TableForeignKey({
        name: `${TABLE_BAND_MEMBERS}_fk_instrument_id`,
        columnNames: ["instrument_id"],
        referencedTableName: TABLE_INSTRUMENTS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    );

    await queryRunner.query(
      `UPDATE ${TABLE_BAND_MEMBERS} members SET instrument_id = instruments.id
         FROM ${TABLE_INSTRUMENTS} instruments
        WHERE members.instrument_id IS NULL AND lower(trim(members.position)) = lower(instruments.name)`,
    );

    const aliases = Object.entries(INSTRUMENT_ALIASES);
    const values = aliases.map((_, index) => `($${index * 2 + 1}::text, $${index * 2 + 2}::int)`).join(", ");
    await queryRunner.query(
      `UPDATE ${TABLE_BAND_MEMBERS} members SET instrument_id = aliases.instrument_id
         FROM (VALUES ${values}) AS aliases(word, instrument_id)
        WHERE members.instrument_id IS NULL
          AND aliases.word = ANY (regexp_split_to_array(lower(members.position), '[^a-z]+'))`,
      aliases.flat(),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(TABLE_BAND_MEMBERS, `${TABLE_BAND_MEMBERS}_fk_instrument_id`);
    for (const column of ["introduced_at", "intro", "welcomed_at", "instrument_id"]) await queryRunner.dropColumn(TABLE_BAND_MEMBERS, column);
  }
}
