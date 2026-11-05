import { RowStatus } from "@soundcircle/shared/utils/util/enums";
import { LocationLevel, LocationType } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";

/**
 * Persisted enum values are contract — stored in `smallint` columns and never renumbered.
 * These make a renumbering fail loudly rather than silently reinterpret every stored row.
 */
describe("contract enum values", () => {
  it("pins RowStatus", () => {
    expect(RowStatus.INACTIVE).toBe(0);
    expect(RowStatus.ACTIVE).toBe(1);
    expect(RowStatus.PENDING).toBe(2);
    expect(RowStatus.REJECTED).toBe(3);
    expect(RowStatus.ARCHIVED).toBe(4);
  });

  it("pins LocationLevel", () => {
    expect(LocationLevel.DIVISION).toBe(1);
    expect(LocationLevel.DISTRICT).toBe(2);
    expect(LocationLevel.SUBDISTRICT).toBe(3);
    expect(LocationLevel.LOCALITY).toBe(4);
  });

  it("pins LocationType", () => {
    expect(LocationType.DIVISION).toBe(1);
    expect(LocationType.DISTRICT).toBe(2);
    expect(LocationType.UPAZILA).toBe(3);
    expect(LocationType.CITY_CORPORATION).toBe(4);
    expect(LocationType.THANA).toBe(5);
    expect(LocationType.AREA).toBe(6);
  });
});
