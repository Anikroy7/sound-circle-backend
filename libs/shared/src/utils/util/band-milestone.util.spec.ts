import { BandMilestone } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { milestonesReached } from "@soundcircle/shared/utils/util/band-milestone.util";

describe("milestonesReached", () => {
  it("unlocks nothing for an owner alone", () => {
    expect(milestonesReached(1)).toEqual([]);
  });

  it("unlocks in order as the band grows", () => {
    expect(milestonesReached(2)).toEqual([BandMilestone.FIRST_MEMBER]);
    expect(milestonesReached(4)).toEqual([BandMilestone.FIRST_MEMBER, BandMilestone.THREE_MEMBERS, BandMilestone.FULL_BAND]);
    expect(milestonesReached(30)).toHaveLength(4);
  });
});
