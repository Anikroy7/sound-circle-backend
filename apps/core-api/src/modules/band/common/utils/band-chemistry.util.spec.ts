import { BandMilestone } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { InstrumentFamily } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { buildLineup, membershipCode, unlockMilestones } from "@apps/core-api/modules/band/common/utils/band-chemistry.util";

const { VOCALS, GUITAR, BASS, DRUMS, KEYS, STRINGS, PERCUSSION } = InstrumentFamily;

describe("buildLineup", () => {
  it("always shows the five core sections, even empty", () => {
    expect(buildLineup([], []).map((slot) => slot.family)).toEqual([VOCALS, GUITAR, BASS, DRUMS, KEYS]);
  });

  it("counts members per section and marks the ones open positions need", () => {
    const lineup = buildLineup([GUITAR, GUITAR, DRUMS], [BASS, DRUMS]);
    expect(lineup.find((slot) => slot.family === GUITAR)).toEqual({ family: GUITAR, count: 2, needed: 0 });
    expect(lineup.find((slot) => slot.family === BASS)).toEqual({ family: BASS, count: 0, needed: 1 });
    expect(lineup.find((slot) => slot.family === DRUMS)).toEqual({ family: DRUMS, count: 1, needed: 1 });
  });

  it("adds other sections after the core, and unknown roles last", () => {
    const families = buildLineup([STRINGS, null, PERCUSSION], []).map((slot) => slot.family);
    expect(families).toEqual([VOCALS, GUITAR, BASS, DRUMS, KEYS, PERCUSSION, STRINGS, null]);
  });
});

describe("membershipCode", () => {
  it("is padded and unique per member", () => {
    expect(membershipCode(5, 42)).toBe("SC-0005-00042");
    expect(membershipCode(5, 42)).not.toBe(membershipCode(5, 43));
  });
});

describe("unlockMilestones", () => {
  const manager = (members: number, held: BandMilestone[]): any => ({
    count: jest.fn(async () => members),
    find: jest.fn(async () => held.map((milestone) => ({ milestone }))),
    create: jest.fn((_entity, row) => row),
    save: jest.fn(async (rows) => rows),
  });

  it("unlocks only what was reached and not already held", async () => {
    const fake = manager(4, [BandMilestone.FIRST_MEMBER]);
    await expect(unlockMilestones(fake, 3)).resolves.toEqual([BandMilestone.THREE_MEMBERS, BandMilestone.FULL_BAND]);
    expect(fake.save).toHaveBeenCalledWith([
      expect.objectContaining({ band_id: 3, milestone: BandMilestone.THREE_MEMBERS }),
      expect.objectContaining({ band_id: 3, milestone: BandMilestone.FULL_BAND }),
    ]);
  });

  it("writes nothing when nothing is new", async () => {
    const fake = manager(2, [BandMilestone.FIRST_MEMBER]);
    await expect(unlockMilestones(fake, 3)).resolves.toEqual([]);
    expect(fake.save).not.toHaveBeenCalled();
  });
});
