import type { JobId } from "@aiuteur/contract";
import { snapshotProfile, type CredentialHandle, type Evidence, type ProfileSnapshot } from "@aiuteur/providers";

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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A long-running video provider: idempotency key, signed webhooks, best-effort cancel. */
export const FAKE_VIDEO_PROFILE: ProfileSnapshot = snapshotProfile({
  offeringId: "fake-video",
  modelId: "fake-video-model",
  adapterId: "fake",
  kind: "fake",
  operationClasses: ["video.take"],
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
  offeringId: "fake-image",
  modelId: "fake-image-model",
  adapterId: "fake",
  kind: "fake",
  operationClasses: ["image.frame", "image.entity"],
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
