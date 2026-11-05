import { Column, Entity, Index, JoinColumn, ManyToOne, Point } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { LocationLevel, LocationType } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { TABLE_LOCATIONS } from "@soundcircle/shared/utils/util/database.table";

/**
 * Bangladesh's administrative tree: Division → District → Upazila / City Corporation → Thana / Area
 * (schema-design §4.2). Seeded; see `location.seeder.ts` for how ids are derived.
 *
 * Every row carries its ancestors, and itself at its own level, so "is X inside P" is
 * `P.id IN (X.division_id, X.district_id, X.subdistrict_id, X.id)` — see `location.util.ts`.
 */
@Entity(TABLE_LOCATIONS)
@Index(`${TABLE_LOCATIONS}_idx_parent_id`, ["parent_id"])
@Index(`${TABLE_LOCATIONS}_idx_center_point`, ["center_point"], { spatial: true })
export class LocationEntity extends AbstractEntity {
  /** Null for a division. */
  @Column({ type: "int", nullable: true })
  parent_id: number;

  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: "parent_id", foreignKeyConstraintName: `${TABLE_LOCATIONS}_fk_parent_id` })
  parent: LocationEntity;

  @Column({ type: "smallint", nullable: false })
  level: LocationLevel;

  @Column({ type: "smallint", nullable: false })
  type: LocationType;

  @Column({ type: "varchar", length: 100, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  name_bn: string;

  /**
   * The place's centre, for "near" searches — never a user's position. Null where the source has
   * none (city corporations and thanas). WGS 84, so distances in metres need no projection.
   */
  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326, nullable: true })
  center_point: Point;

  /** Own id for a division. */
  @Column({ type: "int", nullable: false })
  division_id: number;

  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: "division_id", foreignKeyConstraintName: `${TABLE_LOCATIONS}_fk_division_id` })
  division: LocationEntity;

  /** Own id for a district; null for a division. */
  @Column({ type: "int", nullable: true })
  district_id: number;

  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: "district_id", foreignKeyConstraintName: `${TABLE_LOCATIONS}_fk_district_id` })
  district: LocationEntity;

  /** Its upazila or city corporation; own id at that level; null above it. */
  @Column({ type: "int", nullable: true })
  subdistrict_id: number;

  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: "subdistrict_id", foreignKeyConstraintName: `${TABLE_LOCATIONS}_fk_subdistrict_id` })
  subdistrict: LocationEntity;
}
