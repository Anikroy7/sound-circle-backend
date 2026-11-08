import { LocationLevel, LocationType } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { LocationRepository } from "@soundcircle/shared/database/repositories/reference/location.repository";

/** A location read back to a person: its name with the places above it. */
export interface LabelledLocation {
  id: number;
  level: LocationLevel;
  type: LocationType;
  name: string;
  name_bn: string | null;
  /** Narrowest first: "Mirpur, Dhaka North City Corporation, Dhaka". */
  label: string;
  /** Its division / district / upazila ids (whichever exist), so a client can tell a wider pick covers it. */
  ancestor_ids: number[];
}

/**
 * Labels locations in the order given; unknown or deleted ids are left out. Two queries whatever the
 * count: the places, then every place above them.
 */
export const labelLocations = async (repository: LocationRepository, ids: number[]): Promise<LabelledLocation[]> => {
  if (!ids.length) return [];

  const rows = await repository.getByIds(ids);
  const ancestry = new Map(
    rows.map((row) => [
      row.id,
      [...new Set([row.subdistrict_id, row.district_id, row.division_id].filter((id): id is number => !!id && id !== row.id))],
    ]),
  );
  const ancestors = await repository.getByIds([...new Set([...ancestry.values()].flat())]);
  const nameOf = new Map(ancestors.map((row) => [row.id, row.name]));

  return ids
    .map((id) => rows.find((row) => row.id === id))
    .filter((row) => !!row)
    .map((row) => {
      const ancestorIds = ancestry.get(row.id) ?? [];
      const names = [row.name, ...ancestorIds.map((id) => nameOf.get(id)).filter((name): name is string => !!name)];
      return {
        id: row.id,
        level: row.level,
        type: row.type,
        name: row.name,
        name_bn: row.name_bn ?? null,
        // "Dhaka" the district inside "Dhaka" the division reads once.
        label: [...new Set(names)].join(", "),
        ancestor_ids: ancestorIds,
      };
    });
};
