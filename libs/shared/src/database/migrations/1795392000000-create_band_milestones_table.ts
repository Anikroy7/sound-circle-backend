import { commonColumns, primaryIdColumn } from "@soundcircle/shared/utils/util/abstract.migration";
import { MILESTONE_MEMBER_COUNTS } from "@soundcircle/shared/utils/util/band-milestone.util";
import { TABLE_BAND_MEMBERS, TABLE_BAND_MILESTONES, TABLE_BANDS } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

/** Creates the table, then unlocks what existing bands have already reached, so no band starts behind. */
export class CreateBandMilestonesTable1795392000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_BAND_MILESTONES,
        columns: [
          primaryIdColumn,
          { name: "band_id", type: "int", isNullable: false },
          { name: "milestone", type: "smallint", isNullable: false },
          { name: "achieved_at", type: "timestamptz", isNullable: false },
          ...commonColumns,
        ],
      }),
      true,
    );

    await queryRunner.createIndices(TABLE_BAND_MILESTONES, [
      new TableIndex({
        name: `${TABLE_BAND_MILESTONES}_uq_band_id_milestone`,
        columnNames: ["band_id", "milestone"],
        isUnique: true,
        where: "deleted_at IS NULL",
      }),
    ]);

    await queryRunner.createForeignKeys(TABLE_BAND_MILESTONES, [
      new TableForeignKey({
        name: `${TABLE_BAND_MILESTONES}_fk_band_id`,
        columnNames: ["band_id"],
        referencedTableName: TABLE_BANDS,
        referencedColumnNames: ["id"],
        onDelete: "NO ACTION",
      }),
    ]);

    const thresholds = Object.entries(MILESTONE_MEMBER_COUNTS);
    const values = thresholds.map((_, index) => `($${index * 2 + 1}::smallint, $${index * 2 + 2}::int)`).join(", ");
    await queryRunner.query(
      `INSERT INTO ${TABLE_BAND_MILESTONES} (band_id, milestone, achieved_at)
       SELECT counts.band_id, thresholds.milestone, now()
         FROM (SELECT band_id, count(*) AS members FROM ${TABLE_BAND_MEMBERS} WHERE deleted_at IS NULL GROUP BY band_id) counts
         JOIN (VALUES ${values}) AS thresholds(milestone, members) ON counts.members >= thresholds.members`,
      thresholds.flatMap(([milestone, members]) => [Number(milestone), members]),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_BAND_MILESTONES, true, true, true);
  }
}
