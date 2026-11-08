import { Column, Entity, Index } from "typeorm";
import { AbstractEntity } from "@soundcircle/shared/database/entities/abstract.entity";
import { MediaOwnerType, MediaType } from "@soundcircle/shared/database/entities/media/enums/media.enum";
import { TABLE_PORTFOLIO_MEDIA } from "@soundcircle/shared/utils/util/database.table";

/**
 * An image or audio file stored on Cloudinary; this row is its metadata (schema-design §4.3).
 * ⚠ `owner_id` is polymorphic and has NO foreign key — the service checks the owner exists and is the caller's.
 * Every column but `file_name` comes from Cloudinary's Admin API, never from the client.
 */
@Entity(TABLE_PORTFOLIO_MEDIA)
@Index(`${TABLE_PORTFOLIO_MEDIA}_uq_public_id`, ["public_id"], { unique: true, where: "deleted_at IS NULL" })
@Index(`${TABLE_PORTFOLIO_MEDIA}_idx_owner_type_owner_id`, ["owner_type", "owner_id"])
export class PortfolioMediaEntity extends AbstractEntity {
  @Column({ type: "smallint", nullable: false })
  owner_type: MediaOwnerType;

  @Column({ type: "int", nullable: false })
  owner_id: number;

  @Column({ type: "smallint", nullable: false })
  media_type: MediaType;

  /** The uploader's original name — display only. */
  @Column({ type: "varchar", length: 255, nullable: true })
  file_name: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  public_id: string;

  @Column({ type: "text", nullable: false })
  secure_url: string;

  @Column({ type: "varchar", length: 20, nullable: false })
  format: string;

  /** Bytes. At most 10 MB, so an `int`. */
  @Column({ type: "int", nullable: false })
  file_size: number;

  /** Audio only. */
  @Column({ type: "int", nullable: true })
  duration_seconds: number;
}
