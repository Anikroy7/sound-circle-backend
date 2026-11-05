import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { paginateRaw, Pagination } from "nestjs-typeorm-paginate";
import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";
import { FilterLocationDto } from "@soundcircle/shared/utils/dtos/reference/filter-location.dto";
import { DEFAULT_NEAR_RADIUS_KM, DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from "@soundcircle/shared/utils/util/constant";
import { TABLE_LOCATIONS } from "@soundcircle/shared/utils/util/database.table";
import "@soundcircle/shared/utils/util/sort-order.query-builder";

@Injectable()
export class LocationRepository extends Repository<LocationEntity> {
  constructor(@InjectRepository(LocationEntity) repository: Repository<LocationEntity>) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  LIST_SELECTED_COLUMNS: string[] = [
    "locations.id as id",
    "locations.parent_id as parent_id",
    "locations.level as level",
    "locations.type as type",
    "locations.name as name",
    "locations.name_bn as name_bn",
  ];

  DEFAULT_SELECTED_COLUMNS: string[] = [
    ...this.LIST_SELECTED_COLUMNS,
    "locations.division_id as division_id",
    "locations.district_id as district_id",
    "locations.subdistrict_id as subdistrict_id",
  ];

  /**
   * `child_count` tells the picker whether a row has a next step to drill into; `latitude` / `longitude`
   * are the centre (null where unknown). With `near_location_id`, nearest first and each with `distance_km`.
   */
  async getAll(filters?: FilterLocationDto): Promise<Pagination<LocationEntity> | LocationEntity[]> {
    const builder = this.createQueryBuilder("locations").select(this.LIST_SELECTED_COLUMNS).where("locations.deleted_at IS NULL");

    if (filters?.parent_id !== undefined && filters?.parent_id !== null) {
      builder.andWhere("locations.parent_id = :parentId", { parentId: filters.parent_id });
    }

    if (filters?.level !== undefined && filters?.level !== null) {
      builder.andWhere("locations.level = :level", { level: filters.level });
    }

    if (filters?.search) {
      builder.andWhere("(locations.name ILIKE :search OR locations.name_bn ILIKE :search)", { search: `%${filters.search}%` });
    }

    if (filters?.row_status !== undefined && filters?.row_status !== null) {
      builder.andWhere("locations.row_status = :rowStatus", { rowStatus: filters.row_status });
    }

    // "Near" is measured between place centres — the origin is a location row, never a user's position.
    const near = filters?.near_location_id !== undefined && filters?.near_location_id !== null;
    if (near) {
      builder
        .innerJoin(LocationEntity, "origin", "origin.id = :nearId AND origin.deleted_at IS NULL", { nearId: filters.near_location_id })
        // `ST_DWithin` on geography is in metres and uses the GiST index; a row without a centre never matches.
        .andWhere("ST_DWithin(locations.center_point, origin.center_point, :radiusMeters)", {
          radiusMeters: (filters.radius_km ?? DEFAULT_NEAR_RADIUS_KM) * 1000,
        });
    }

    builder.sortOrder(filters?.sort_order_by);
    if (near) builder.addOrderBy("ST_Distance(locations.center_point, origin.center_point)", "ASC");
    builder.addOrderBy("locations.name", "ASC");

    // After `sortOrder()`: expressions it cannot parse into its allowlist.
    builder
      .addSelect(
        `(SELECT count(*)::int FROM ${TABLE_LOCATIONS} children WHERE children.parent_id = locations.id AND children.deleted_at IS NULL)`,
        "child_count",
      )
      .addSelect("ST_Y(locations.center_point::geometry)", "latitude")
      .addSelect("ST_X(locations.center_point::geometry)", "longitude");
    if (near) builder.addSelect("round((ST_Distance(locations.center_point, origin.center_point) / 1000)::numeric, 1)::float8", "distance_km");

    return filters?.page_no || filters?.page_size
      ? paginateRaw(builder, { page: filters.page_no ?? DEFAULT_PAGE_NO, limit: filters.page_size ?? DEFAULT_PAGE_SIZE })
      : builder.getRawMany();
  }

  /** With the ancestry columns, for `location.util.ts`. Unknown and deleted ids are simply absent. */
  async getByIds(ids: number[]): Promise<LocationEntity[]> {
    if (!ids?.length) return [];

    return this.createQueryBuilder("locations")
      .select(this.DEFAULT_SELECTED_COLUMNS)
      .where("locations.id IN (:...ids)", { ids })
      .andWhere("locations.deleted_at IS NULL")
      .getRawMany();
  }
}
