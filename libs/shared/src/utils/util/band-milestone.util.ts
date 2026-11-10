import { BandMilestone } from "@soundcircle/shared/database/entities/band/enums/band.enum";

/** How many members (owner included) unlock each milestone (schema-design §4.5). */
export const MILESTONE_MEMBER_COUNTS: Readonly<Record<BandMilestone, number>> = {
  [BandMilestone.FIRST_MEMBER]: 2,
  [BandMilestone.THREE_MEMBERS]: 3,
  [BandMilestone.FULL_BAND]: 4,
  [BandMilestone.FIVE_MEMBERS]: 5,
};

/** Every milestone a band of `memberCount` has reached, in unlock order. */
export const milestonesReached = (memberCount: number): BandMilestone[] =>
  (Object.entries(MILESTONE_MEMBER_COUNTS) as [string, number][])
    .filter(([, count]) => memberCount >= count)
    .map(([milestone]) => Number(milestone) as BandMilestone)
    .sort((a, b) => MILESTONE_MEMBER_COUNTS[a] - MILESTONE_MEMBER_COUNTS[b]);
