import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { paginateRaw, Pagination } from "nestjs-typeorm-paginate";
import { UserEntity } from "@soundcircle/shared/database/entities/identity/user.entity";
import { ContactVisibility } from "@soundcircle/shared/database/entities/identity/enums/identity.enum";
import { FilterUserDto } from "@soundcircle/shared/utils/dtos/identity/filter-user.dto";
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from "@soundcircle/shared/utils/util/constant";
import "@soundcircle/shared/utils/util/sort-order.query-builder";

/** ⚠ `password_hash` is in none of these lists, and no method here may select it. */
@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(@InjectRepository(UserEntity) repository: Repository<UserEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  LIST_SELECTED_COLUMNS: string[] = ["users.id as id", "users.name as name", "users.row_status as row_status", "users.created_at as created_at"];

  DEFAULT_SELECTED_COLUMNS: string[] = [
    ...this.LIST_SELECTED_COLUMNS,
    "users.email as email",
    "users.phone as phone",
    "users.email_visibility as email_visibility",
    "users.phone_visibility as phone_visibility",
  ];

  /**
   * Every caller is a visitor until auth lands, so `email` / `phone` come back only when
   * `PUBLIC` and are null otherwise (schema-design §5.1).
   */
  async getAll(filters?: FilterUserDto): Promise<Pagination<UserEntity> | UserEntity[]> {
    const builder = this.createQueryBuilder("users").select(this.LIST_SELECTED_COLUMNS).where("users.deleted_at IS NULL");

    if (filters?.search) {
      builder.andWhere("users.name ILIKE :search", { search: `%${filters.search}%` });
    }

    if (filters?.row_status !== undefined && filters?.row_status !== null) {
      builder.andWhere("users.row_status = :rowStatus", { rowStatus: filters.row_status });
    }

    builder.sortOrder(filters?.sort_order_by);

    // ⚠ Added after `sortOrder()` on purpose, so neither masked column is sortable — ordering by a hidden email leaks it.
    builder
      .addSelect("CASE WHEN users.email_visibility = :publicVisibility THEN users.email END", "email")
      .addSelect("CASE WHEN users.phone_visibility = :publicVisibility THEN users.phone END", "phone")
      .setParameter("publicVisibility", ContactVisibility.PUBLIC);

    return filters?.page_no || filters?.page_size
      ? paginateRaw(builder, { page: filters.page_no ?? DEFAULT_PAGE_NO, limit: filters.page_size ?? DEFAULT_PAGE_SIZE })
      : builder.getRawMany();
  }

  /** ⚠ Unmasked — for the account's own reader only (the create response, `GET /auth/me`), never another user. */
  async getOne(id: number): Promise<UserEntity> {
    return this.createQueryBuilder("users")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("users.id = :id", { id })
      .andWhere("users.deleted_at IS NULL")
      .getRawOne();
  }

  /**
   * ⚠ The one read that selects `password_hash` — for `AuthService.login` to verify against,
   * and never returned to a client. Undefined when no active account has the email.
   */
  async getCredentialsByEmail(email: string): Promise<{ id: number; password_hash: string } | undefined> {
    return this.createQueryBuilder("users")
      .select(["users.id as id", "users.password_hash as password_hash"])
      .where("users.email = :email", { email })
      .andWhere("users.deleted_at IS NULL")
      .getRawOne();
  }

  /** A login is not an edit of the account, so `updated_at` / `updated_by` are deliberately left alone. */
  async recordLogin(id: number): Promise<void> {
    await this.createQueryBuilder()
      .update(UserEntity)
      .set({ last_login_at: () => "now()", updated_at: () => "updated_at" })
      .where("id = :id", { id })
      .execute();
  }
}
