/**
 * Turns a band member's free-text position ("Keys", "Backing vocals", "Lead guitar") into a catalogue
 * instrument, so a member added by hand still counts in the band's lineup. Ids are the seeded ones
 * (`instrument.seeder.ts`), which are contract.
 */

/** Words people write for a role, lower-cased, → the instrument id they mean. */
export const INSTRUMENT_ALIASES: Readonly<Record<string, number>> = {
  vocal: 1,
  vocals: 1,
  vocalist: 1,
  singer: 1,
  voice: 1,
  guitar: 3,
  guitarist: 3,
  bass: 4,
  bassist: 4,
  drum: 5,
  drummer: 5,
  keys: 6,
  keyboards: 6,
  keyboardist: 6,
  synth: 8,
  synths: 8,
  flute: 16,
  percussionist: 25,
};

/**
 * The instrument a position names, or null. In order: the exact name ("Drums"), the longest catalogue
 * name inside it ("Bass guitar player" → Bass guitar, not Electric guitar), then a known word ("Lead
 * guitar" → Electric guitar, "Backing vocals" → Vocals). Bass is tried before guitar on purpose.
 */
export const matchInstrument = (position: string | null | undefined, instruments: ReadonlyArray<{ id: number; name: string }>): number | null => {
  const text = (position ?? "").trim().toLowerCase();
  if (!text) return null;

  const exact = instruments.find((instrument) => instrument.name.toLowerCase() === text);
  if (exact) return exact.id;

  const contained = instruments.filter((instrument) => text.includes(instrument.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
  if (contained) return contained.id;

  const words = text.split(/[^a-z]+/).filter(Boolean);
  if (words.includes("bass") || words.includes("bassist")) return INSTRUMENT_ALIASES.bass;
  for (const word of words) if (INSTRUMENT_ALIASES[word] !== undefined) return INSTRUMENT_ALIASES[word];
  return null;
};
