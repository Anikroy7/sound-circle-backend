import {
  BaseEntity,
  BeforeInsert,
  BeforeRemove,
  BeforeSoftRemove,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ROW_STATUS_COLUMN_COMMENT, RowStatus } from "@soundcircle/shared/utils/util/enums";
import { AuthUser, RequestIp } from "@soundcircle/shared/utils/util/utils";

/**
 * Every entity extends this (schema-design §1). Timestamps, actor and IP
 * columns are `select: false` — a query that needs them selects them explicitly.
 *
 * ⚠ **Stamping fires only on entity persistence.** `save()` and `softRemove()` trigger
 * these hooks; `update()`, `insert()` and `softDelete()` fire nothing and must carry
 * `updated_by` / `updated_ip` in the patch. `softDelete()` is banned — it never writes
 * `deleted_by` / `deleted_ip`.
 *
 * ⚠ One definition in two places: keep in step with `commonColumns` / `primaryIdColumn`
 * (`abstract.migration.ts`); `migration-structure.spec.ts` asserts they agree.
 */
export abstract class AbstractEntity extends BaseEntity {
  /**
   * ⚠ `identity`, not the default `increment`: TypeORM drops an `increment` PK from every
   * INSERT it builds, so an explicit seed `id` is silently replaced by the next sequence value.
   */
  @PrimaryGeneratedColumn("identity", { type: "int", generatedIdentity: "BY DEFAULT" })
  id: number;

  @Column({ type: "smallint", default: RowStatus.ACTIVE, comment: ROW_STATUS_COLUMN_COMMENT })
  row_status: number;

  @CreateDateColumn({ type: "timestamptz", select: false })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz", select: false })
  updated_at: Date;

  @DeleteDateColumn({ type: "timestamptz", select: false })
  deleted_at: Date;

  @Column({ type: "int", nullable: true, select: false })
  created_by: number;

  @Column({ type: "int", nullable: true, select: false })
  updated_by: number;

  @Column({ type: "int", nullable: true, select: false })
  deleted_by: number;

  @Column({ type: "varchar", length: 45, nullable: true, select: false })
  created_ip: string;

  @Column({ type: "varchar", length: 45, nullable: true, select: false })
  updated_ip: string;

  @Column({ type: "varchar", length: 45, nullable: true, select: false })
  deleted_ip: string;

  @BeforeInsert()
  beforeCreated(): void {
    this.created_by = AuthUser.get()?.getId();
    this.created_ip = RequestIp.get();
  }

  // Fires only when the model itself is changed and saved.
  @BeforeUpdate()
  beforeUpdated(): void {
    this.updated_by = AuthUser.get()?.getId();
    this.updated_ip = RequestIp.get();
  }

  @BeforeRemove()
  beforeDeleted(): void {
    this.deleted_by = AuthUser.get()?.getId();
    this.deleted_ip = RequestIp.get();
  }

  @BeforeSoftRemove()
  beforeSoftRemove(): void {
    this.deleted_by = AuthUser.get()?.getId();
    this.deleted_ip = RequestIp.get();
  }

  getId(): number {
    return this.id;
  }
}
