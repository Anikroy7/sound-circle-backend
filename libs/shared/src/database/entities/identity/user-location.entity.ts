import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { TABLE_USER_LOCATIONS } from "@soundcircle/shared/utils/util/database.table";

/**
 * Where a user is available to join a band — not where they live (schema-design §4.1).
 * A pick at any level is one row; its children are covered by matching, never expanded into rows.
 */
@Entity(TABLE_USER_LOCATIONS)
@Index(`${TABLE_USER_LOCATIONS}_uq_user_id_location_id`, ["user_id", "location_id"], { unique: true, where: "deleted_at IS NULL" })
@Index(`${TABLE_USER_LOCATIONS}_idx_location_id`, ["location_id"])
export class UserLocationEntity extends AbstractEntity {
  @Column({ type: "int", nullable: false })
  user_id: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: `${TABLE_USER_LOCATIONS}_fk_user_id` })
  user: UserEntity;

  @Column({ type: "int", nullable: false })
  location_id: number;

  @ManyToOne(() => LocationEntity)
  @JoinColumn({ name: "location_id", foreignKeyConstraintName: `${TABLE_USER_LOCATIONS}_fk_location_id` })
  location: LocationEntity;
}
