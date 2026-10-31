import { BadRequestException } from "@nestjs/common";
import * as lodash from "lodash";
import { SelectQueryBuilder } from "typeorm/query-builder/SelectQueryBuilder";
import { SortOrderDto } from "@soundcircle/shared/utils/dtos/filter-common.dto";

/**
 * `.sortOrder(filters?.sort_order_by)` — the one place `sort_order_by[]` becomes an
 * `ORDER BY`. Validated against the query's OWN selected columns, which is the per-route
 * allowlist coding-standards §3 requires: a repository's `SELECT` already withholds
 * everything that must not be orderable, so an unconstrained column name here can only
 * order by what the projection already exposes — never inject one.
 *
 * ⚠ Installed by a side-effect import in every app's `main.ts`:
 *
 *     import "@soundcircle/shared/utils/util/sort-order.query-builder";
 *
 * Omit it in one app and every `.sortOrder()` call there throws `TypeError: ... is not a
 * function` the first time a list route is hit.
 */
declare module "typeorm/query-builder/SelectQueryBuilder" {
  interface SelectQueryBuilder<Entity> {
    sortOrder(this: SelectQueryBuilder<Entity>, sort?: SortOrderDto[] | SortOrderDto): SelectQueryBuilder<Entity>;
  }
}

SelectQueryBuilder.prototype.sortOrder = function <Entity>(
  this: SelectQueryBuilder<Entity>,
  sort?: SortOrderDto[] | SortOrderDto,
): SelectQueryBuilder<Entity> {
  const selectedColumns: any[] = this?.expressionMap?.selects || []; // e.g. [{ selection: "offices.id as id" }]
  const aliasColumns: Record<string, string> = {}; // e.g. { id: "offices.id" }

  selectedColumns.forEach((item) => {
    const parts = lodash.split(item.selection, " ");
    const alias = lodash.last(parts);
    aliasColumns[alias] = lodash.first(parts);
  });

  const isQueryColumnExist = (columnName: string): boolean => {
    return Object.values(aliasColumns).includes(columnName) || Object.keys(aliasColumns).includes(columnName);
  };

  const apply = ({ column_name, dir }: SortOrderDto): void => {
    if (!isQueryColumnExist(column_name)) throw new BadRequestException(`Invalid Sort Column ${column_name}`);
    this.addOrderBy(aliasColumns[column_name] ?? column_name, (dir?.toUpperCase() as "ASC" | "DESC") ?? "ASC");
  };

  if (Array.isArray(sort)) {
    sort.forEach(apply);
  } else if (sort && typeof sort === "object") {
    apply(sort);
  }

  return this;
};
