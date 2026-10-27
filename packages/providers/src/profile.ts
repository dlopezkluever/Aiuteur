import { createHash } from "node:crypto";
import type { Billed, CancelBilling, FailureClass, OperationClass } from "@aiuteur/contract";
import type { RenderedRequest, TransportKind } from "./transport.ts";

// Draft FC10: the parts of the capability profile (PROVIDERS-AND-MODELS §4) that the
// adapter face and its conformance suite consume. Fit-facing sections (input modes,
// reference constraints, duration, output, controls, limits) are added by the tickets
// that first consume them.

/** Where a profile field's value comes from (PROVIDERS-AND-MODELS §4.1, Evidence). */
export type Evidence =
  | { readonly kind: "documented"; readonly source: string; readonly fetchedOn: string }
  | { readonly kind: "verified"; readonly conformanceRun: string; readonly date: string }
  | { readonly kind: "assumed"; readonly reviewer: string; readonly reason: string };

/** A profile field: `declared(value)`, `declared-none` or `unknown` (PROVIDERS-AND-MODELS §4.3). */
export type Declared<T> =
  | { readonly state: "declared"; readonly value: T; readonly evidence: Evidence }
  | { readonly state: "declared-none"; readonly evidence: Evidence }
  | { readonly state: "unknown" };

/** The value of a `declared` field, or `undefined` for `declared-none` and `unknown`. */
export function declaredValue<T>(field: Declared<T>): T | undefined {
  return field.state === "declared" ? field.value : undefined;
}

/** One documented provider error and the JOB-LIFECYCLE §5.2 class it maps to. */
export interface ErrorMapEntry {
  readonly providerCode: string;
  readonly failureClass: FailureClass;
  readonly billed: Billed;
}

/** The run-behaviour declarations of JOB-LIFECYCLE §9. */
export interface RunBehaviour {
  readonly idempotentSubmission: Declared<"key" | "lookup" | "neither">;
  readonly completionSignal: Declared<{
    readonly webhook: "none" | "verifiable" | "unverifiable";
    readonly pollMinIntervalMs: number;
    readonly maxRuntimeMs: number;
  }>;
  readonly cancellation: Declared<"none" | "best-effort" | "reliable">;
  readonly outputRetention: Declared<{
    readonly windowMs: number;
    readonly urlLifetimeMs: number;
    readonly fetchNeedsAuth: boolean;
  }>;
  readonly billingOnCancel: Declared<CancelBilling>;
  readonly errorMapping: Declared<readonly ErrorMapEntry[]>;
}
export type RunBehaviourField = keyof RunBehaviour;

export type BilledUnit = "image" | "second";

/** The billed-quantity rule: what the provider bills, as a function of the Rendered request. */
export type BilledQuantityRule =
  | { readonly rule: "per-output"; readonly unit: "image"; readonly countParameter: string }
  | { readonly rule: "duration-requested"; readonly unit: "second"; readonly durationParameter: string }
  | {
      readonly rule: "duration-set-ceiling";
      readonly unit: "second";
      readonly durationParameter: string;
      readonly set: readonly number[];
    };

export interface ProfileContent {
  readonly offeringId: string;
  readonly modelId: string;
  readonly adapterId: string;
  readonly kind: TransportKind;
  readonly operationClasses: readonly OperationClass[];
  readonly cost: {
    readonly billedQuantity: Declared<BilledQuantityRule>;
    readonly actualCostReported: Declared<boolean>;
  };
  readonly runBehaviour: RunBehaviour;
}

declare const snapshotBrand: unique symbol;
export type ProfileSnapshotId = string & { readonly [snapshotBrand]: "ProfileSnapshotId" };

/** An immutable profile snapshot. Its id is the content hash. */
export interface ProfileSnapshot extends ProfileContent {
  readonly snapshotId: ProfileSnapshotId;
}

/** Canonical JSON: object keys sorted, no whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

export function snapshotProfile(content: ProfileContent): ProfileSnapshot {
  const hash = createHash("sha256").update(canonicalJson(content)).digest("hex");
  return { ...content, snapshotId: `sha256:${hash}` as ProfileSnapshotId };
}

/** Maps a provider error code through the declared map. Anything not documented is *Unknown, maybe billed*. */
export function classifyProviderError(
  mapping: Declared<readonly ErrorMapEntry[]>,
  providerCode: string,
): { readonly failureClass: FailureClass; readonly billed: Billed } {
  const entry = declaredValue(mapping)?.find((e) => e.providerCode === providerCode);
  return entry === undefined
    ? { failureClass: "unknown", billed: "maybe" }
    : { failureClass: entry.failureClass, billed: entry.billed };
}

export interface BilledQuantity {
  readonly unit: BilledUnit;
  readonly amount: number;
  readonly bounds: { readonly min: number; readonly max: number };
}

/** Applies a billed-quantity rule to a Rendered request (BUSINESS-AND-OPERATIONS §4.2). */
export function billedQuantityFor(rule: BilledQuantityRule, request: RenderedRequest): BilledQuantity {
  const exact = (amount: number): BilledQuantity => ({ unit: rule.unit, amount, bounds: { min: amount, max: amount } });
  switch (rule.rule) {
    case "per-output": {
      const count = request.parameters[rule.countParameter] ?? 1;
      if (typeof count !== "number" || !Number.isInteger(count) || count < 1) {
        throw new RangeError(`parameter ${rule.countParameter} is not a positive whole number`);
      }
      return exact(count);
    }
    case "duration-requested":
      return exact(durationOf(request, rule.durationParameter));
    case "duration-set-ceiling": {
      const requested = durationOf(request, rule.durationParameter);
      const billed = [...rule.set].sort((a, b) => a - b).find((member) => member >= requested);
      if (billed === undefined) throw new RangeError(`duration ${requested} is above the declared set`);
      return exact(billed);
    }
  }
}

function durationOf(request: RenderedRequest, parameter: string): number {
  const value = request.parameters[parameter];
  if (typeof value !== "number" || !(value > 0)) throw new RangeError(`parameter ${parameter} is not a duration`);
  return value;
}
