import { Check, Column, Entity, Index } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { ContactVisibility } from "@soundcircle/shared/database/entities/identity/enums/identity.enum";
import { TABLE_USERS } from "@soundcircle/shared/utils/util/database.table";

/** One account, however it signed up — email + password, Google or phone OTP (schema-design §4.1). */
@Entity(TABLE_USERS)
@Index(`${TABLE_USERS}_uq_email`, ["email"], { unique: true, where: "deleted_at IS NULL" })
@Index(`${TABLE_USERS}_uq_phone`, ["phone"], { unique: true, where: "deleted_at IS NULL" })
@Index(`${TABLE_USERS}_uq_google_id`, ["google_id"], { unique: true, where: "deleted_at IS NULL" })
@Check(`${TABLE_USERS}_ck_email_or_phone`, "email IS NOT NULL OR phone IS NOT NULL")
export class UserEntity extends AbstractEntity {
  @Column({ type: "varchar", length: 100, nullable: false })
  name: string;

  /** Stored lower-cased — `CreateUserDto` normalises it. */
  @Column({ type: "varchar", length: 255, nullable: true })
  email: string;

  /** E.164. */
  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string;

  /** ⚠ `select: false` and never in a repository column list — no read may return it. */
  @Column({ type: "varchar", length: 255, nullable: true, select: false })
  password_hash: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  google_id: string;

  @Column({ type: "timestamptz", nullable: true })
  email_verified_at: Date;

  @Column({ type: "timestamptz", nullable: true })
  phone_verified_at: Date;

  @Column({ type: "smallint", nullable: false, default: ContactVisibility.ONLY_ME })
  email_visibility: ContactVisibility;

  @Column({ type: "smallint", nullable: false, default: ContactVisibility.ONLY_ME })
  phone_visibility: ContactVisibility;

  @Column({ type: "timestamptz", nullable: true })
  last_login_at: Date;
}
