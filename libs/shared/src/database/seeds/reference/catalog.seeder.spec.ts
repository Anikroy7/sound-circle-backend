import { buildInstrumentRows, INSTRUMENTS } from "@soundcircle/shared/database/seeds/reference/instrument.seeder";
import { buildGenreRows, GENRES } from "@soundcircle/shared/database/seeds/reference/genre.seeder";

/** The two catalogue seeders share their rules, so one spec covers both. */
describe.each([
  { label: "instruments", list: INSTRUMENTS, build: buildInstrumentRows },
  { label: "genres", list: GENRES, build: buildGenreRows },
])("$label seed data", ({ list, build }) => {
  it("never repeats an id", () => {
    expect(new Set(list.map((row) => row.id)).size).toBe(list.length);
  });

  /* Mirrors the `_uq_name` index, which ignores nothing — "Rock" and "rock" would both insert, then confuse every picker. */
  it("never repeats a name, case-insensitively", () => {
    expect(new Set(list.map((row) => row.name.toLowerCase())).size).toBe(list.length);
  });

  it("fits every name in varchar(60)", () => {
    expect(list.filter((row) => !row.name.trim() || row.name.length > 60)).toEqual([]);
  });

  it("sorts in list order", () => {
    expect(build().map((row) => row.sort_order)).toEqual(list.map((_, index) => index + 1));
  });
});

describe("instrument seed data", () => {
  /* A band role is an instrument (schema-design §4.2), so a band can only look for a singer if Vocals exists. */
  it("includes Vocals and the Bangladeshi staples", () => {
    const names = INSTRUMENTS.map((row) => row.name);

    expect(names).toEqual(expect.arrayContaining(["Vocals", "Harmonium", "Tabla", "Dhol", "Dotara", "Ektara"]));
  });
});
