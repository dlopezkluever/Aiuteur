import { loadCatalogue, snapshotProfile, type Catalogue, type Evidence, type ProfileContent, type ProfileSnapshot } from "@aiuteur/providers";
import { FAKE_IMAGE_PROFILE, FAKE_VIDEO_PROFILE, syntheticSections } from "./fake-profiles.ts";

// A synthetic Catalogue for tests (VERIFICATION-AND-OBSERVABILITY §3: fakes are parameterised
// by an evidenced profile). Every value is invented for testing and marked `assumed`; none is
// a provider fact, and every price is a synthetic number in the one reporting currency.

const synthetic: Evidence = { kind: "assumed", reviewer: "T0-04", reason: "Synthetic test-provider value; a fake has no vendor documentation" };
const none = { state: "declared-none", evidence: synthetic } as const;
const unknown = { state: "unknown" } as const;

/** A token-priced text Offering: prompt limit counted in UTF-8 bytes (a token upper bound), 2,048 output tokens at most. */
export const FAKE_TEXT_PROFILE_CONTENT: ProfileContent = {
  ...syntheticSections("text"),
  offeringId: "fake-text",
  modelId: "fake-text-model",
  family: "text",
  operationClasses: ["text.create", "text.check"],
  duration: none,
  output: none,
  limits: {
    prompt: { state: "declared", value: { unit: "tokens", counter: "utf8-bytes", max: 8192, margin: 256 }, evidence: synthetic },
    output: { state: "declared", value: { unit: "tokens", max: 2048 }, evidence: synthetic },
    requestBytes: unknown,
    policyNotes: none,
  },
  cost: {
    billedQuantity: { state: "declared", value: { rule: "text-tokens", counter: "utf8-bytes", outputMaxParameter: "maxOutputTokens", outputMin: 0 }, evidence: synthetic },
    actualCostReported: { state: "declared", value: true, evidence: synthetic },
  },
  runBehaviour: { idempotentSubmission: unknown, completionSignal: unknown, cancellation: unknown, outputRetention: unknown, billingOnCancel: unknown, errorMapping: unknown },
};
export const FAKE_TEXT_PROFILE: ProfileSnapshot = snapshotProfile(FAKE_TEXT_PROFILE_CONTENT);

const strip = ({ snapshotId: _id, ...content }: ProfileSnapshot): ProfileContent => content;

/** Raw Catalogue data, as an operator's reviewed file would hold it: one Offering per test case of selection. */
export const SYNTHETIC_CATALOGUE_DATA = {
  offerings: [
    { status: "active", profile: FAKE_TEXT_PROFILE_CONTENT },
    // Ranked higher, but its prompt limit is undocumented: Automatic skips it (PROVIDERS §4.3).
    { status: "active", profile: { ...FAKE_TEXT_PROFILE_CONTENT, offeringId: "fake-text-undocumented", modelId: "fake-text-undocumented-model", limits: { ...FAKE_TEXT_PROFILE_CONTENT.limits, prompt: unknown } } },
    // Ranked highest, but a preview Offering is not default-eligible (PROVIDERS §10.1).
    { status: "preview", profile: { ...FAKE_TEXT_PROFILE_CONTENT, offeringId: "fake-text-preview", modelId: "fake-text-preview-model" } },
    { status: "active", profile: strip(FAKE_VIDEO_PROFILE) },
    { status: "active", profile: strip(FAKE_IMAGE_PROFILE) },
  ],
  ranking: { "text.create": ["fake-text-preview-model", "fake-text-undocumented-model", "fake-text-model"] },
  priceEntries: [
    { offeringId: "fake-text", operationClass: "text.create", unit: "input-token", per: 1_000_000, priceMicros: 3_000_000, confirmedOn: "2026-10-20", source: "published" },
    { offeringId: "fake-text", operationClass: "text.create", unit: "output-token", per: 1_000_000, priceMicros: 15_000_000, confirmedOn: "2026-10-20", source: "published" },
    { offeringId: "fake-image", operationClass: "image.frame", unit: "image", per: 1, priceMicros: 40_000, confirmedOn: "2026-10-20", source: "published" },
    { offeringId: "fake-video", operationClass: "video.take", unit: "second", per: 1, priceMicros: 100_000, confirmedOn: "2026-10-20", source: "published" },
  ],
};

export function syntheticCatalogue(): Catalogue {
  return loadCatalogue(SYNTHETIC_CATALOGUE_DATA);
}

/** A price policy for tests whose estimate must not depend on the day the suite runs. */
export const TEST_PRICE_POLICY = Object.freeze({ widenAfterDays: 36_500, unknownAfterDays: 73_000, driftPermille: 100 });
