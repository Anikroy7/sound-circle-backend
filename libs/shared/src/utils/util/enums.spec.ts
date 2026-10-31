import { RowStatus } from "@soundcircle/shared/utils/util/enums";

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
});
