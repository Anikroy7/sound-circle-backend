/** What `computeProfileCompletion` scores — the facts the setup steps produce (schema-design §5.3). */
export interface ProfileCompletionFacts {
  hasBio: boolean;
  /** Step 1: at least one location. */
  locations: number;
  /** Step 1, optional: a profile photo. */
  hasPhoto: boolean;
  performedGenres: number;
  instruments: number;
  hasPhone: boolean;
  availabilitySlots: number;
  hasBandInterest: boolean;
  /** Gallery audio + photos + video links. */
  galleryItems: number;
  bandExperienceStepDone: boolean;
}

/** Weights from schema-design §5.3; they sum to 100. The photo and the gallery are optional: 85 without them. */
export const COMPLETION_WEIGHTS: Record<keyof ProfileCompletionFacts, number> = {
  hasBio: 10,
  locations: 5,
  hasPhoto: 5,
  performedGenres: 15,
  instruments: 15,
  hasPhone: 10,
  availabilitySlots: 10,
  hasBandInterest: 10,
  galleryItems: 10,
  bandExperienceStepDone: 10,
};

/** 0–100. A fact counts when it is true or at least 1. */
export const computeProfileCompletion = (facts: ProfileCompletionFacts): number =>
  (Object.keys(COMPLETION_WEIGHTS) as (keyof ProfileCompletionFacts)[]).reduce(
    (total, key) => total + (Number(facts[key]) > 0 ? COMPLETION_WEIGHTS[key] : 0),
    0,
  );
