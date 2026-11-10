import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";

/** The columns every hierarchy question needs (schema-design §4.2). */
export type LocationAncestry = Pick<LocationEntity, "id" | "division_id" | "district_id" | "subdistrict_id">;

/** True when `outer` is `inner` or one of its ancestors: Dhaka division covers Savar. */
export const locationCovers = (outer: Pick<LocationEntity, "id">, inner: LocationAncestry): boolean =>
  [inner.division_id, inner.district_id, inner.subdistrict_id, inner.id].includes(outer.id);

/** Drops every pick another pick in the set already covers: Dhaka division + Savar → Dhaka division. */
export const dropCoveredLocations = <T extends LocationAncestry>(locations: T[]): T[] =>
  locations.filter((location) => !locations.some((other) => other.id !== location.id && locationCovers(other, location)));

/**
 * SQL for "these two locations overlap": one covers the other (schema-design §5.4). `a` and `b` are
 * aliases of `locations` rows. The musician-to-band match and both discovery location filters use it.
 */
export const locationsOverlapSql = (a: string, b: string): string =>
  `(${b}.id IN (${a}.division_id, ${a}.district_id, ${a}.subdistrict_id, ${a}.id) OR ${a}.id IN (${b}.division_id, ${b}.district_id, ${b}.subdistrict_id))`;
