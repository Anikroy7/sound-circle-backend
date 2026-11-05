import { LocationLevel, LocationType } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { buildLocationRows, geocodeToId, readLocationSources, toPoint } from "@soundcircle/shared/database/seeds/reference/location.seeder";

/** Runs against the real source files, so a broken data refresh fails here rather than half-way through a seed. */
const rows = buildLocationRows(readLocationSources());
const byId = new Map(rows.map((row) => [row.id, row]));
const ofType = (type: LocationType): typeof rows => rows.filter((row) => row.type === type);
const childrenOf = (id: number): string[] => rows.filter((row) => row.parent_id === id).map((row) => row.name);

const DHAKA_DISTRICT = 3026;
const DHAKA_NORTH = 302601;

describe("buildLocationRows", () => {
  it("yields 8 divisions, 64 districts, 495 upazilas, 12 city corporations and 110 metropolitan thanas", () => {
    expect(ofType(LocationType.DIVISION)).toHaveLength(8);
    expect(ofType(LocationType.DISTRICT)).toHaveLength(64);
    expect(ofType(LocationType.UPAZILA)).toHaveLength(495);
    expect(ofType(LocationType.CITY_CORPORATION)).toHaveLength(12);
    expect(ofType(LocationType.THANA)).toHaveLength(110);
  });

  it("gives every place one id, inside int4", () => {
    expect(byId.size).toBe(rows.length);
    expect(rows.filter((row) => !Number.isInteger(row.id) || row.id < 1 || row.id > 2_147_483_647)).toEqual([]);
  });

  it("derives BBS ids from the geocode", () => {
    expect(geocodeToId("BD30")).toBe(30);
    expect(geocodeToId("BD3026")).toBe(3026);
    expect(byId.get(30)).toMatchObject({ name: "Dhaka", type: LocationType.DIVISION, name_bn: "ঢাকা" });
    expect(byId.get(DHAKA_DISTRICT)).toMatchObject({ name: "Dhaka", type: LocationType.DISTRICT, parent_id: 30 });
  });

  it("rejects a malformed geocode instead of seeding NaN", () => {
    expect(() => geocodeToId("3026")).toThrow();
  });

  it("puts Dhaka's two city corporations beside its upazilas", () => {
    expect(childrenOf(DHAKA_DISTRICT)).toEqual(
      expect.arrayContaining(["Dhaka North City Corporation", "Dhaka South City Corporation", "Savar", "Dhamrai"]),
    );
    expect(byId.get(DHAKA_NORTH)).toMatchObject({ name: "Dhaka North City Corporation", level: LocationLevel.SUBDISTRICT });
  });

  it("puts the metropolitan thanas under their city corporation", () => {
    expect(childrenOf(DHAKA_NORTH)).toEqual(expect.arrayContaining(["Shah Ali", "Gulshan", "Uttara West"]));
    expect(childrenOf(DHAKA_NORTH)).not.toContain("Dhanmondi");
  });

  it("lists every parent before its children", () => {
    const seen = new Set<number>();
    const problems = rows.filter((row) => {
      const ok = row.parent_id === null || seen.has(row.parent_id);
      seen.add(row.id);
      return !ok;
    });

    expect(problems).toEqual([]);
  });

  it("matches each row's level to its type", () => {
    const levelOf: Record<LocationType, LocationLevel> = {
      [LocationType.DIVISION]: LocationLevel.DIVISION,
      [LocationType.DISTRICT]: LocationLevel.DISTRICT,
      [LocationType.UPAZILA]: LocationLevel.SUBDISTRICT,
      [LocationType.CITY_CORPORATION]: LocationLevel.SUBDISTRICT,
      [LocationType.THANA]: LocationLevel.LOCALITY,
      [LocationType.AREA]: LocationLevel.LOCALITY,
    };

    expect(rows.filter((row) => levelOf[row.type] !== row.level)).toEqual([]);
  });

  /* The ancestry columns are what matching reads (schema-design §5.4); a wrong one silently mismatches. */
  it("fills each row's ancestry from its parent chain, and itself at its own level", () => {
    const problems: string[] = [];

    for (const row of rows) {
      const parent = byId.get(row.parent_id);
      const expected =
        row.level === LocationLevel.DIVISION
          ? { division_id: row.id, district_id: null, subdistrict_id: null }
          : row.level === LocationLevel.DISTRICT
            ? { division_id: parent.id, district_id: row.id, subdistrict_id: null }
            : row.level === LocationLevel.SUBDISTRICT
              ? { division_id: parent.division_id, district_id: parent.id, subdistrict_id: row.id }
              : { division_id: parent.division_id, district_id: parent.district_id, subdistrict_id: parent.id };

      const actual = { division_id: row.division_id, district_id: row.district_id, subdistrict_id: row.subdistrict_id };
      if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`${row.id} ${row.name}`);
    }

    expect(problems).toEqual([]);
  });

  it("never repeats a name under one parent", () => {
    const keys = rows.map((row) => `${row.parent_id}/${row.name}`);

    expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
  });

  it("gives every division, district and upazila a centre, and no city corporation or thana an invented one", () => {
    const withPoint = (type: LocationType): number => ofType(type).filter((row) => row.center_point).length;

    expect(withPoint(LocationType.DIVISION)).toBe(8);
    expect(withPoint(LocationType.DISTRICT)).toBe(64);
    expect(withPoint(LocationType.UPAZILA)).toBe(495);
    expect(withPoint(LocationType.CITY_CORPORATION)).toBe(0);
    expect(withPoint(LocationType.THANA)).toBe(0);
  });

  /* GeoJSON is [longitude, latitude]; the reverse puts Savar in the Indian Ocean and every distance wrong. */
  it("writes GeoJSON points longitude first", () => {
    expect(rows.find((row) => row.name === "Savar").center_point).toEqual({ type: "Point", coordinates: [90.281, 23.88] });
  });

  it("refuses a point outside Bangladesh, which is what a swapped lat/lon looks like", () => {
    expect(() => toPoint(90.281, 23.88, "Savar")).toThrow(/not in Bangladesh/);
  });

  it("fits every name in its varchar(100) column", () => {
    expect(rows.filter((row) => row.name.length > 100 || row.name_bn?.length > 100)).toEqual([]);
  });
});
