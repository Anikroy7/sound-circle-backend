import { LocationEntity } from "@soundcircle/shared/database/entities/reference/location.entity";

/** The columns every hierarchy question needs (schema-design §4.2). */
export type LocationAncestry = Pick<LocationEntity, "id" | "division_id" | "district_id" | "subdistrict_id">;

/** True when `outer` is `inner` or one of its ancestors: Dhaka division covers Savar. */
export const locationCovers = (outer: Pick<LocationEntity, "id">, inner: LocationAncestry): boolean =>
  [inner.division_id, inner.district_id, inner.subdistrict_id, inner.id].includes(outer.id);

/** Drops every pick another pick in the set already covers: Dhaka division + Savar → Dhaka division. */
export const dropCoveredLocations = <T extends LocationAncestry>(locations: T[]): T[] =>
  locations.filter((location) => !locations.some((other) => other.id !== location.id && locationCovers(other, location)));
