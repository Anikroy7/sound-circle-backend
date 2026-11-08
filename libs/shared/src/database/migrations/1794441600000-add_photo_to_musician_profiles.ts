import { TABLE_MUSICIAN_PROFILES } from "@soundcircle/shared/utils/util/database.table";
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

/**
 * The profile photo (schema-design §4.4): one image on Cloudinary, kept as two columns on the
 * profile rather than a portfolio item. An `add_` migration because `musician_profiles` already
 * holds data on developer databases.
 */
export class AddPhotoToMusicianProfiles1794441600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(TABLE_MUSICIAN_PROFILES, [
      new TableColumn({ name: "photo_public_id", type: "varchar", length: "255", isNullable: true }),
      new TableColumn({ name: "photo_url", type: "varchar", length: "500", isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(TABLE_MUSICIAN_PROFILES, "photo_url");
    await queryRunner.dropColumn(TABLE_MUSICIAN_PROFILES, "photo_public_id");
  }
}
