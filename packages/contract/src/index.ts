// Draft FC1/FC2. Contracts freeze at T0 exit, not at this ticket.
export * from "./studio.ts";
export * from "./history.ts";
export * from "./generation.ts";

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** A Job id. It is also the idempotency key and correlation id sent to a provider (JOB-LIFECYCLE §4). */
export type JobId = Brand<string, "JobId">;

/** Retry classes of JOB-LIFECYCLE §5.2. */
export const FAILURE_CLASSES = [
  "transient-unbilled",
  "transient-maybe-billed",
  "output-retrieval",
  "output-lost",
  "permanent-input",
  "provider-safety-refusal",
  "platform-configuration",
  "unknown",
] as const;
export type FailureClass = (typeof FAILURE_CLASSES)[number];

/** What a failure is known to have cost (JOB-LIFECYCLE §5.2). Anything unknown is `maybe`. */
export const BILLED = ["no", "maybe", "yes"] as const;
export type Billed = (typeof BILLED)[number];

/** What a cancelled run is known to have cost (JOB-LIFECYCLE §2, §6). */
export const CANCEL_BILLING = ["none", "maybe", "yes"] as const;
export type CancelBilling = (typeof CANCEL_BILLING)[number];
