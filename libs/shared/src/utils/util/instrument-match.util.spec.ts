import { INSTRUMENTS } from "@soundcircle/shared/database/seeds/reference/instrument.seeder";
import { INSTRUMENT_ALIASES, matchInstrument } from "@soundcircle/shared/utils/util/instrument-match.util";

const idOf = (name: string): number => INSTRUMENTS.find((instrument) => instrument.name === name).id;

describe("matchInstrument", () => {
  it.each([
    ["Drums", "Drums"],
    ["  drums ", "Drums"],
    ["Keys", "Keyboard"],
    ["Keyboards", "Keyboard"],
    ["Backing vocals", "Vocals"],
    ["Lead guitar", "Electric guitar"],
    ["Bass guitar player", "Bass guitar"],
    ["Bass", "Bass guitar"],
    ["Synth & samples", "Synthesizer"],
  ])("%s → %s", (position, instrument) => {
    expect(matchInstrument(position, INSTRUMENTS)).toBe(idOf(instrument));
  });

  it("returns null for nothing it recognises", () => {
    expect(matchInstrument("Manager", INSTRUMENTS)).toBeNull();
    expect(matchInstrument("", INSTRUMENTS)).toBeNull();
    expect(matchInstrument(null, INSTRUMENTS)).toBeNull();
  });

  it("points every alias at a seeded instrument", () => {
    const ids = new Set(INSTRUMENTS.map((instrument) => instrument.id));
    expect(Object.values(INSTRUMENT_ALIASES).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe("instrument families", () => {
  it("classifies every seeded instrument", () => {
    expect(INSTRUMENTS.filter((instrument) => !instrument.family).map((instrument) => instrument.name)).toEqual([]);
  });
});
