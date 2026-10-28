import type { JobId } from "@aiuteur/contract";
import { snapshotProfile, type CredentialHandle, type Evidence, type ProfileContent, type ProfileSnapshot } from "@aiuteur/providers";

// Profile snapshots for the T0 test providers. Their run behaviour models the ranges
// the platform research recorded (JOB-LIFECYCLE §9): webhooks with retries and
// duplicates, one-hour output URLs, cancel absent or best effort, creation idempotent
// by key on some providers and only by lookup on others.

const research: Evidence = {
  kind: "documented",
  source: "Platform research #9 (2026-10-18), as recorded in JOB-LIFECYCLE §9",
  fetchedOn: "2026-10-18",
};
const fakeProfile: Evidence = {
  kind: "assumed",
  reviewer: "T0-00",
  reason: "Synthetic test-provider value; a fake has no vendor documentation",
};

const unknown = { state: "unknown" } as const;
const none = { state: "declared-none", evidence: fakeProfile } as const;

/**
 * The sections a synthetic profile leaves unpopulated: identity extras, input modes,
 * references, extension, audio (EI3: reserved, no audio Offering exists), text, controls
 * and limits. A test provider states only what it was made to model; the rest is
 * `unknown`, read conservatively (F1), or `declared-none` where a fake plainly has none.
 */
export function syntheticSections(family: ProfileContent["family"]): Omit<ProfileContent, "offeringId" | "modelId" | "family" | "operationClasses" | "cost" | "runBehaviour" | "duration" | "output" | "limits"> {
  return {
    adapterId: "fake",
    dialect: { id: "neutral-text", version: 1 },
    kind: "fake",
    tier: "test",
    stability: { state: "declared", value: "stable", evidence: fakeProfile },
    shutdownOn: none,
    successorModelId: none,
    operations: { state: "declared", value: ["generate"], evidence: fakeProfile },
    inputModes: unknown,
    referenceConstraints: unknown,
    referenceBinding: unknown,
    extension: none,
    audio: {
      native: family === "video" ? { state: "declared", value: "optional", evidence: fakeProfile } : none,
      dialogueFromText: unknown, lipSyncDocumented: unknown, languages: unknown, drivingAudio: none, voiceReferences: none,
      voiceSources: none, voiceSourceRequirement: none, voiceDesign: none, deleteVoice: none, lipSyncSubjects: none, timingOutput: none,
    },
    text: { structuredOutput: family === "text" ? { state: "declared", value: "none", evidence: fakeProfile } : none, imageInput: none },
    controls: { seed: none, negativePrompt: none, tunables: none, rewrites: none, echoesPrompt: { state: "declared", value: false, evidence: fakeProfile } },
    knownLimitations: none,
  };
}
const mediaLimits = { prompt: unknown, output: none, requestBytes: unknown, policyNotes: none } as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A long-running video provider: idempotency key, signed webhooks, best-effort cancel. */
export const FAKE_VIDEO_PROFILE: ProfileSnapshot = snapshotProfile({
  ...syntheticSections("video"),
  offeringId: "fake-video",
  modelId: "fake-video-model",
  family: "video",
  operationClasses: ["video.take"],
  duration: { state: "declared", value: { kind: "set", members: [4, 6, 8], default: 4, auto: false, billed: "set-ceiling" }, evidence: fakeProfile },
  output: { state: "declared", value: { aspects: ["16:9", "9:16"], resolutions: [720], frameRates: [24] }, evidence: fakeProfile },
  limits: mediaLimits,
  cost: {
    billedQuantity: {
      state: "declared",
      value: { rule: "duration-set-ceiling", unit: "second", durationParameter: "durationSeconds", set: [4, 6, 8] },
      evidence: fakeProfile,
    },
    actualCostReported: { state: "declared", value: true, evidence: fakeProfile },
  },
  runBehaviour: {
    idempotentSubmission: { state: "declared", value: "key", evidence: research },
    completionSignal: {
      state: "declared",
      value: { webhook: "verifiable", pollMinIntervalMs: 5_000, maxRuntimeMs: 30 * MINUTE },
      evidence: research,
    },
    cancellation: { state: "declared", value: "best-effort", evidence: research },
    outputRetention: {
      state: "declared",
      value: { windowMs: 24 * HOUR, urlLifetimeMs: HOUR, fetchNeedsAuth: false },
      evidence: research,
    },
    billingOnCancel: { state: "declared", value: "maybe", evidence: research },
    errorMapping: {
      state: "declared",
      value: [
        { providerCode: "invalid_parameter", failureClass: "permanent-input", billed: "no" },
        { providerCode: "content_policy_violation", failureClass: "provider-safety-refusal", billed: "maybe" },
        { providerCode: "insufficient_quota", failureClass: "platform-configuration", billed: "no" },
        { providerCode: "model_not_found", failureClass: "platform-configuration", billed: "no" },
        { providerCode: "server_error_not_charged", failureClass: "transient-unbilled", billed: "no" },
        { providerCode: "internal_error", failureClass: "transient-maybe-billed", billed: "maybe" },
      ],
      evidence: fakeProfile,
    },
  },
});

/** A poll-only image provider: lookup by correlation id, no cancel, no reported cost. */
export const FAKE_IMAGE_PROFILE: ProfileSnapshot = snapshotProfile({
  ...syntheticSections("image"),
  offeringId: "fake-image",
  modelId: "fake-image-model",
  family: "image",
  operationClasses: ["image.frame", "image.entity"],
  duration: none,
  output: { state: "declared", value: { aspects: ["16:9", "9:16"], resolutions: [1080], frameRates: [] }, evidence: fakeProfile },
  limits: mediaLimits,
  cost: {
    billedQuantity: {
      state: "declared",
      value: { rule: "per-output", unit: "image", countParameter: "count" },
      evidence: fakeProfile,
    },
    actualCostReported: { state: "declared", value: false, evidence: fakeProfile },
  },
  runBehaviour: {
    idempotentSubmission: { state: "declared", value: "lookup", evidence: research },
    completionSignal: {
      state: "declared",
      value: { webhook: "none", pollMinIntervalMs: 2_000, maxRuntimeMs: 5 * MINUTE },
      evidence: research,
    },
    cancellation: { state: "declared", value: "none", evidence: research },
    outputRetention: {
      state: "declared",
      value: { windowMs: HOUR, urlLifetimeMs: HOUR, fetchNeedsAuth: false },
      evidence: research,
    },
    billingOnCancel: { state: "declared", value: "maybe", evidence: research },
    errorMapping: {
      state: "declared",
      value: [
        { providerCode: "invalid_parameter", failureClass: "permanent-input", billed: "no" },
        { providerCode: "content_policy_violation", failureClass: "provider-safety-refusal", billed: "no" },
        { providerCode: "internal_error", failureClass: "transient-maybe-billed", billed: "maybe" },
      ],
      evidence: fakeProfile,
    },
  },
});

/** A credential handle for tests. Fakes never read it. */
export function testCredential(): CredentialHandle {
  return Object.freeze({}) as CredentialHandle;
}

/** A Job id for tests. Production ids are minted by the Ids port. */
export function testJobId(label: string): JobId {
  return `job-${label}` as JobId;
}
