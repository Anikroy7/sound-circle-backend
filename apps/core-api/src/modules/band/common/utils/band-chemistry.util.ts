import { EntityManager } from "typeorm";
import { BandMemberEntity } from "@soundcircle/shared/database/entities/band/band-member.entity";
import { BandMilestoneEntity } from "@soundcircle/shared/database/entities/band/band-milestone.entity";
import { BandMilestone } from "@soundcircle/shared/database/entities/band/enums/band.enum";
import { InstrumentFamily } from "@soundcircle/shared/database/entities/reference/enums/reference.enum";
import { milestonesReached } from "@soundcircle/shared/utils/util/band-milestone.util";
import { LineupSlotView } from "@apps/core-api/modules/band/common/types/band.type";

/** The sections every band's lineup shows, filled or not. Other families appear once someone plays one. */
export const CORE_FAMILIES: ReadonlyArray<InstrumentFamily> = [
  InstrumentFamily.VOCALS,
  InstrumentFamily.GUITAR,
  InstrumentFamily.BASS,
  InstrumentFamily.DRUMS,
  InstrumentFamily.KEYS,
];

/**
 * Members per section, and how many open positions want each. `null` is "Other": a member whose role
 * matched no catalogue instrument (or an unclassified one). Core sections first, then the rest in enum order.
 */
export const buildLineup = (memberFamilies: (InstrumentFamily | null)[], neededFamilies: (InstrumentFamily | null)[]): LineupSlotView[] => {
  const slots = new Map<InstrumentFamily | null, LineupSlotView>(CORE_FAMILIES.map((family) => [family, { family, count: 0, needed: 0 }]));
  const slot = (family: InstrumentFamily | null): LineupSlotView => {
    if (!slots.has(family)) slots.set(family, { family, count: 0, needed: 0 });
    return slots.get(family);
  };
  memberFamilies.forEach((family) => slot(family ?? null).count++);
  neededFamilies.forEach((family) => slot(family ?? null).needed++);

  const rank = (family: InstrumentFamily | null): number =>
    family === null ? Number.MAX_SAFE_INTEGER : CORE_FAMILIES.includes(family) ? CORE_FAMILIES.indexOf(family) - 100 : family;
  return [...slots.values()].sort((a, b) => rank(a.family) - rank(b.family));
};

/** A member's card number: unique because the member id is, and stable for the life of the membership. */
export const membershipCode = (bandId: number, memberId: number): string =>
  `SC-${String(bandId).padStart(4, "0")}-${String(memberId).padStart(5, "0")}`;

/**
 * Unlocks every milestone the band's current size has reached and it doesn't hold yet. Call it inside the
 * transaction that adds a member, after the insert and under the band's row lock, so the count is exact.
 */
export const unlockMilestones = async (manager: EntityManager, bandId: number): Promise<BandMilestone[]> => {
  const count = await manager.count(BandMemberEntity, { where: { band_id: bandId } });
  const held = (await manager.find(BandMilestoneEntity, { where: { band_id: bandId } })).map((row) => Number(row.milestone));
  const fresh = milestonesReached(count).filter((milestone) => !held.includes(milestone));
  if (fresh.length) {
    const now = new Date();
    await manager.save(fresh.map((milestone) => manager.create(BandMilestoneEntity, { band_id: bandId, milestone, achieved_at: now })));
  }
  return fresh;
};
