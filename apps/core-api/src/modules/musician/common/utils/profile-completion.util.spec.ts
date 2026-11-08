import {
  COMPLETION_WEIGHTS,
  computeProfileCompletion,
  ProfileCompletionFacts,
} from "@apps/core-api/modules/musician/common/utils/profile-completion.util";

const EMPTY: ProfileCompletionFacts = {
  hasBio: false,
  locations: 0,
  hasPhoto: false,
  performedGenres: 0,
  instruments: 0,
  hasPhone: false,
  availabilitySlots: 0,
  hasBandInterest: false,
  galleryItems: 0,
  bandExperienceStepDone: false,
};

const FULL: ProfileCompletionFacts = {
  hasBio: true,
  locations: 2,
  hasPhoto: true,
  performedGenres: 2,
  instruments: 1,
  hasPhone: true,
  availabilitySlots: 3,
  hasBandInterest: true,
  galleryItems: 4,
  bandExperienceStepDone: true,
};

describe("computeProfileCompletion", () => {
  it("weights sum to exactly 100, so the CHECK constraint can never fail", () => {
    expect(Object.values(COMPLETION_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("is 0 for an empty profile and 100 for a full one", () => {
    expect(computeProfileCompletion(EMPTY)).toBe(0);
    expect(computeProfileCompletion(FULL)).toBe(100);
  });

  /* The photo and the gallery are the optional parts (schema-design §5.3). */
  it("finishes at 85% when the photo and the gallery are skipped", () => {
    expect(computeProfileCompletion({ ...FULL, galleryItems: 0, hasPhoto: false })).toBe(85);
  });

  it("counts a list once, however long it is", () => {
    expect(computeProfileCompletion({ ...EMPTY, instruments: 1 })).toBe(computeProfileCompletion({ ...EMPTY, instruments: 10 }));
  });
});
