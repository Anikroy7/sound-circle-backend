import { dropCoveredLocations, locationCovers } from "@soundcircle/shared/utils/util/location.util";

const DHAKA_DIVISION = { id: 30, division_id: 30, district_id: null, subdistrict_id: null };
const DHAKA_DISTRICT = { id: 3026, division_id: 30, district_id: 3026, subdistrict_id: null };
const SAVAR = { id: 30260072, division_id: 30, district_id: 3026, subdistrict_id: 30260072 };
const GAZIPUR = { id: 3033, division_id: 30, district_id: 3033, subdistrict_id: null };
const CHATTOGRAM_DIVISION = { id: 20, division_id: 20, district_id: null, subdistrict_id: null };

describe("locationCovers", () => {
  it("covers itself and everything below it", () => {
    expect(locationCovers(SAVAR, SAVAR)).toBe(true);
    expect(locationCovers(DHAKA_DISTRICT, SAVAR)).toBe(true);
    expect(locationCovers(DHAKA_DIVISION, SAVAR)).toBe(true);
    expect(locationCovers(DHAKA_DIVISION, GAZIPUR)).toBe(true);
  });

  it("never covers upwards, sideways or across divisions", () => {
    expect(locationCovers(SAVAR, DHAKA_DISTRICT)).toBe(false);
    expect(locationCovers(GAZIPUR, SAVAR)).toBe(false);
    expect(locationCovers(CHATTOGRAM_DIVISION, SAVAR)).toBe(false);
  });
});

describe("dropCoveredLocations", () => {
  it("keeps only the widest pick on each branch", () => {
    expect(dropCoveredLocations([SAVAR, DHAKA_DIVISION, DHAKA_DISTRICT]).map((l) => l.id)).toEqual([30]);
  });

  it("keeps picks on separate branches and across divisions", () => {
    expect(dropCoveredLocations([SAVAR, GAZIPUR, CHATTOGRAM_DIVISION]).map((l) => l.id)).toEqual([30260072, 3033, 20]);
  });
});
