import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { BandType } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { TABLE_BANDS } from "@soundcircle/shared/utils/util/database.table";

/**
 * A band (schema-design §4.5). Created as a draft by creation step 1 and public once `published_at`
 * is set. ⚠ No owner column: the owner is the `band_members` row with `role = OWNER`.
 */
@Entity(TABLE_BANDS)
@Index(`${TABLE_BANDS}_uq_slug`, ["slug"], { unique: true, where: "deleted_at IS NULL" })
@Index(`${TABLE_BANDS}_idx_location_id`, ["location_id"])
@Check(`${TABLE_BANDS}_ck_slug_when_published`, "published_at IS NULL OR slug IS NOT NULL")
export class BandEntity extends AbstractEntity {
  @Column({ type: "varchar", length: 100, nullable: false })
  name: string;

  /** `/bands/:slug`, set on publish: the name in kebab case plus `-<id>`, unique by construction. */
  @Column({ type: "varchar", length: 120, nullable: true })
  slug: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  logo_public_id: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  logo_url: string | null;

  /** The description. */
  @Column({ type: "text", nullable: false })
  bio: string;

  /** Where the band practises: any level of the location tree. */
  @Column({ type: "int", nullable: false })
  location_id: number;

  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: "location_id", foreignKeyConstraintName: `${TABLE_BANDS}_fk_location_id` })
  location: LocationEntity;

  @Column({ type: "smallint", nullable: false })
  band_type: BandType;

  /** Null while a draft. */
  @Column({ type: "timestamptz", nullable: true })
  published_at: Date | null;
}
