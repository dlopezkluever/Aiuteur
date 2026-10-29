import { createHash } from "node:crypto";
import { z } from "zod";
import {
  AUTHORISATION_KINDS, BILLED, DELIVERY_CONTROLS, SPEECH_LENGTH_UNITS, BILLED_DURATION_BASES, CANCEL_BILLING, COUNTERS, DRIVING_AUDIO_LENGTH_RULES, DRIVING_AUDIO_OWN_AUDIO,
  EXTENSION_OUTPUTS, FAILURE_CLASSES, KNOWN_LIMITATION_CODES, LIMIT_UNITS, LIPSYNC_SUBJECTS, MODEL_FAMILIES, NATIVE_AUDIO_MODES,
  OPERATION_CLASSES, OPERATION_KINDS, PROVIDER_STABILITIES, REFERENCE_BINDINGS, REFERENCE_ROLES, REWRITE_MODES, SEED_GUARANTEES,
  STRUCTURED_OUTPUT_MODES, TIMING_OUTPUTS, VOICE_SOURCES,
  type Billed, type BilledUnit, type Counter, type FailureClass, type RenderedRequest,
} from "@aiuteur/contract";
import { TRANSPORT_KINDS } from "./transport.ts";

// Draft FC10: the capability profile (PROVIDERS-AND-MODELS §4; EI3). One schema; the types
// are derived from it. Every field is `declared(value)`, `declared-none` or `unknown`, and
// `unknown` is read conservatively by its consumer (§4.3, F1). Lifecycle status is the
// Catalogue's operational overlay, not snapshot content (§10.1, §10.3).

/** Where a profile field's value comes from (PROVIDERS-AND-MODELS §4.1, Evidence). */
export const evidenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("documented"), source: z.string().min(1), fetchedOn: z.iso.date() }),
  z.strictObject({ kind: z.literal("verified"), conformanceRun: z.string().min(1), date: z.iso.date() }),
  z.strictObject({ kind: z.literal("assumed"), reviewer: z.string().min(1), reason: z.string().min(1) }),
]);
export type Evidence = z.infer<typeof evidenceSchema>;

/** A profile field: `declared(value)`, `declared-none` or `unknown` (PROVIDERS-AND-MODELS §4.3). */
export type Declared<T> =
  | { readonly state: "declared"; readonly value: T; readonly evidence: Evidence }
  | { readonly state: "declared-none"; readonly evidence: Evidence }
  | { readonly state: "unknown" };
function declared<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion("state", [
    z.strictObject({ state: z.literal("declared"), value, evidence: evidenceSchema }),
    z.strictObject({ state: z.literal("declared-none"), evidence: evidenceSchema }),
    z.strictObject({ state: z.literal("unknown") }),
  ]);
}

/** The value of a `declared` field, or `undefined` for `declared-none` and `unknown`. */
export function declaredValue<T>(field: Declared<T>): T | undefined {
  return field.state === "declared" ? field.value : undefined;
}

const positive = z.number().positive();
const aspect = z.string().regex(/^[1-9]\d*:[1-9]\d*$/);

/** The billed-quantity rule: what the provider bills, as a function of the Rendered request (BUSINESS §4.2). */
const billedQuantityRuleSchema = z.discriminatedUnion("rule", [
  z.strictObject({ rule: z.literal("per-output"), unit: z.literal("image"), countParameter: z.string().min(1) }),
  z.strictObject({ rule: z.literal("duration-requested"), unit: z.literal("second"), durationParameter: z.string().min(1) }),
  z.strictObject({ rule: z.literal("duration-set-ceiling"), unit: z.literal("second"), durationParameter: z.string().min(1), set: z.array(positive).min(1) }),
  /** Token-priced text: input counted from the request's text parts; output from `outputMin` to the request's maximum-output parameter. */
  z.strictObject({ rule: z.literal("text-tokens"), counter: z.enum(COUNTERS), outputMaxParameter: z.string().min(1), outputMin: z.int().min(0) }),
]);
export type BilledQuantityRule = z.infer<typeof billedQuantityRuleSchema>;

const errorMapEntrySchema = z.strictObject({ providerCode: z.string().min(1), failureClass: z.enum(FAILURE_CLASSES), billed: z.enum(BILLED) });
export type ErrorMapEntry = z.infer<typeof errorMapEntrySchema>;

const rangeSchema = z.strictObject({ min: z.number().min(0), max: z.number().min(0) });
const durationSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("set"), members: z.array(positive).min(1), default: positive, auto: z.boolean(), billed: z.enum(BILLED_DURATION_BASES) }),
  z.strictObject({ kind: z.literal("range"), min: positive, max: positive, step: positive, default: positive, auto: z.boolean(), billed: z.enum(BILLED_DURATION_BASES) }),
]);

/** One small predicate form over typed request fields (PROVIDERS §4.2). */
const conditionSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("eq"), field: z.string().min(1), value: z.union([z.string(), z.number()]) }),
  z.strictObject({ op: z.literal("in"), field: z.string().min(1), values: z.array(z.union([z.string(), z.number()])).min(1) }),
  z.strictObject({ op: z.literal("range"), field: z.string().min(1), min: z.number(), max: z.number() }),
]);
const effectSchema = z.discriminatedUnion("effect", [
  z.strictObject({ effect: z.literal("requires"), role: z.enum(REFERENCE_ROLES) }),
  z.strictObject({ effect: z.literal("excludes"), roles: z.array(z.enum(REFERENCE_ROLES)).min(1) }),
  z.strictObject({ effect: z.literal("caps"), role: z.enum(REFERENCE_ROLES), max: z.int().min(0) }),
  z.strictObject({ effect: z.literal("forces"), parameter: z.string().min(1), value: z.union([z.string(), z.number(), z.boolean()]) }),
]);
const constraintSchema = z.union([effectSchema, z.strictObject({ when: conditionSchema, then: effectSchema })]);

export const profileContentSchema = z.strictObject({
  // Identity and lifecycle
  offeringId: z.string().min(1),
  modelId: z.string().min(1),
  family: z.enum(MODEL_FAMILIES),
  adapterId: z.string().min(1),
  /** The adapter's dialect (GENERATION-PACKAGE §10.1); must name a dialect the Catalogue face knows. */
  dialect: z.strictObject({ id: z.string().min(1), version: z.int().positive() }),
  kind: z.enum(TRANSPORT_KINDS),
  tier: z.string().min(1),
  stability: declared(z.enum(PROVIDER_STABILITIES)),
  shutdownOn: declared(z.iso.date()),
  successorModelId: declared(z.string().min(1)),
  // Operations
  operationClasses: z.array(z.enum(OPERATION_CLASSES)).min(1),
  operations: declared(z.array(z.enum(OPERATION_KINDS)).min(1)),
  // Input modes, reference constraints and binding
  inputModes: declared(z.array(z.strictObject({
    name: z.string().min(1),
    roles: z.array(z.strictObject({ role: z.enum(REFERENCE_ROLES), max: z.int().min(0), worksBestUpTo: z.int().min(0).nullable() })),
    constraints: z.array(constraintSchema),
  })).min(1)),
  referenceConstraints: declared(z.array(z.strictObject({
    role: z.enum(REFERENCE_ROLES),
    aspectRange: rangeSchema.nullable(),
    maxBytes: z.int().positive().nullable(),
    formats: z.array(z.string().min(1)),
    facePolicy: declared(z.string().min(1)),
    resolution: rangeSchema.nullable(),
  }))),
  referenceBinding: declared(z.enum(REFERENCE_BINDINGS)),
  // Duration, extension, output
  duration: declared(durationSchema),
  extension: declared(z.strictObject({
    sameModelOnly: z.boolean(),
    increment: z.union([z.strictObject({ set: z.array(positive).min(1) }), z.strictObject({ min: positive, max: positive, step: positive })]),
    maxTotal: positive,
    input: z.strictObject({ resolutions: z.array(z.int().positive()), aspects: z.array(aspect), maxSeconds: positive.nullable() }),
    output: z.enum(EXTENSION_OUTPUTS),
  })),
  output: declared(z.strictObject({
    aspects: z.union([z.array(aspect).min(1), z.literal("follows-input")]),
    resolutions: z.array(z.int().positive()).min(1),
    frameRates: z.array(positive),
    /** Container and codec expectations (PROVIDERS §4.1 Output), checked at ingest (#70), never transcoded here. */
    containers: z.array(z.string().min(1)),
    codecs: z.array(z.string().min(1)),
  })),
  // Audio (PROVIDERS §4.1, §13; VOICE-AND-PERFORMANCE §5). Reserved and unpopulated in T0.
  audio: z.strictObject({
    native: declared(z.enum(NATIVE_AUDIO_MODES)),
    dialogueFromText: declared(z.boolean()),
    lipSyncDocumented: declared(z.boolean()),
    languages: declared(z.array(z.string().min(1))),
    /** Driving audio as role `audio.line`: length rule, per-clip and total limits, what happens to the model's own audio (VOICE §5.2). */
    drivingAudio: declared(z.strictObject({ lengthRule: z.enum(DRIVING_AUDIO_LENGTH_RULES), perClipSeconds: positive.nullable(), totalSeconds: positive.nullable(), ownAudio: z.enum(DRIVING_AUDIO_OWN_AUDIO) })),
    /** Speech (VOICE §5.2): per-request length with its unit and counter, and delivery controls. Voice sources, languages, timing output and seed are their own fields. */
    speech: declared(z.strictObject({
      perRequestLength: z.strictObject({ unit: z.enum(SPEECH_LENGTH_UNITS), counter: z.enum(COUNTERS).nullable(), max: positive }),
      deliveryControls: z.array(z.enum(DELIVERY_CONTROLS)).min(1),
    })),
    voiceReferences: declared(z.strictObject({ maxCount: z.int().min(0), perClipSeconds: positive.nullable(), totalSeconds: positive.nullable() })),
    voiceSources: declared(z.array(z.enum(VOICE_SOURCES)).min(1)),
    voiceSourceRequirement: declared(z.enum(AUTHORISATION_KINDS)),
    voiceDesign: declared(z.boolean()),
    deleteVoice: declared(z.boolean()),
    lipSyncSubjects: declared(z.array(z.enum(LIPSYNC_SUBJECTS)).min(1)),
    timingOutput: declared(z.enum(TIMING_OUTPUTS)),
  }),
  // Text family additions (PROVIDERS §13)
  text: z.strictObject({
    structuredOutput: declared(z.enum(STRUCTURED_OUTPUT_MODES)),
    imageInput: declared(z.boolean()),
  }),
  // Controls
  controls: z.strictObject({
    seed: declared(z.strictObject({ guarantee: z.enum(SEED_GUARANTEES) })),
    negativePrompt: declared(z.strictObject({ maxCharacters: z.int().positive().nullable() })),
    tunables: declared(z.array(z.strictObject({ parameter: z.string().min(1), min: z.number(), max: z.number() }))),
    rewrites: declared(z.array(z.strictObject({ name: z.string().min(1), mode: z.enum(REWRITE_MODES), disableParameter: z.string().min(1).nullable() })).min(1)),
    echoesPrompt: declared(z.boolean()),
  }),
  // Limits
  limits: z.strictObject({
    prompt: declared(z.strictObject({ unit: z.enum(LIMIT_UNITS), counter: z.enum(COUNTERS), max: z.int().positive(), margin: z.int().min(0) })),
    output: declared(z.strictObject({ unit: z.literal("tokens"), max: z.int().positive() })),
    requestBytes: declared(z.int().positive()),
    policyNotes: declared(z.array(z.string().min(1)).min(1)),
  }),
  // Cost: the rule only; prices live in the registry (PROVIDERS §14)
  cost: z.strictObject({
    billedQuantity: declared(billedQuantityRuleSchema),
    actualCostReported: declared(z.boolean()),
  }),
  // Run behaviour (JOB-LIFECYCLE §9)
  runBehaviour: z.strictObject({
    idempotentSubmission: declared(z.enum(["key", "lookup", "neither"])),
    completionSignal: declared(z.strictObject({ webhook: z.enum(["none", "verifiable", "unverifiable"]), pollMinIntervalMs: z.int().min(0), maxRuntimeMs: z.int().positive() })),
    cancellation: declared(z.enum(["none", "best-effort", "reliable"])),
    outputRetention: declared(z.strictObject({ windowMs: z.int().positive(), urlLifetimeMs: z.int().positive(), fetchNeedsAuth: z.boolean() })),
    billingOnCancel: declared(z.enum(CANCEL_BILLING)),
    errorMapping: declared(z.array(errorMapEntrySchema)),
  }),
  // Known limitations
  knownLimitations: declared(z.array(z.strictObject({ code: z.enum(KNOWN_LIMITATION_CODES), sentence: z.string().min(1) })).min(1)),
});
export type ProfileContent = z.infer<typeof profileContentSchema>;
export type RunBehaviour = ProfileContent["runBehaviour"];
export type RunBehaviourField = keyof RunBehaviour;

declare const snapshotBrand: unique symbol;
export type ProfileSnapshotId = string & { readonly [snapshotBrand]: "ProfileSnapshotId" };

/** An immutable profile snapshot. Its id is the content hash. */
export type ProfileSnapshot = ProfileContent & { readonly snapshotId: ProfileSnapshotId };

/** Canonical JSON: object keys sorted, no whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

export function sha256(text: string): string {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

/** Freezes a value and everything reachable from it. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Snapshots a deep copy of `content`, frozen all the way down, so neither the caller's object nor
 * any holder of the snapshot can change what its content-addressed id names (PROVIDERS §10.3).
 */
export function snapshotProfile(content: ProfileContent): ProfileSnapshot {
  const copy = structuredClone(content);
  return deepFreeze({ ...copy, snapshotId: sha256(canonicalJson(copy)) as ProfileSnapshotId });
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

/** A prompt-limit counter (PROVIDERS §4.1 Limits). `utf8-bytes` never under-counts tokens of a byte-level tokeniser. */
export function count(text: string, counter: Counter): number {
  return counter === "utf8-bytes" ? new TextEncoder().encode(text).length : [...text].length;
}

export interface BilledQuantity {
  readonly unit: BilledUnit;
  readonly amount: number;
  readonly bounds: { readonly min: number; readonly max: number };
}

export type MediaBilledQuantityRule = Exclude<BilledQuantityRule, { rule: "text-tokens" }>;

/** Applies a single-unit billed-quantity rule to a Rendered request (BUSINESS-AND-OPERATIONS §4.2). */
export function billedQuantityFor(rule: MediaBilledQuantityRule, request: RenderedRequest): BilledQuantity {
  const exact = (amount: number): BilledQuantity => ({ unit: rule.unit, amount, bounds: { min: amount, max: amount } });
  switch (rule.rule) {
    case "per-output": {
      const n = request.parameters[rule.countParameter] ?? 1;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
        throw new RangeError(`parameter ${rule.countParameter} is not a positive whole number`);
      }
      return exact(n);
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

/** Every billed quantity of a Rendered request. Token-priced text bills input and output separately (#101 decision 5). */
export function billedQuantities(rule: BilledQuantityRule, request: RenderedRequest): BilledQuantity[] {
  if (rule.rule !== "text-tokens") return [billedQuantityFor(rule, request)];
  const input = request.textParts.reduce((sum, part) => sum + count(part.text, rule.counter), 0);
  const max = request.parameters[rule.outputMaxParameter];
  if (typeof max !== "number" || !Number.isInteger(max) || max < rule.outputMin) {
    throw new RangeError(`parameter ${rule.outputMaxParameter} is not a maximum output at or above ${rule.outputMin}`);
  }
  return [
    { unit: "input-token", amount: input, bounds: { min: input, max: input } },
    { unit: "output-token", amount: max, bounds: { min: rule.outputMin, max } },
  ];
}

function durationOf(request: RenderedRequest, parameter: string): number {
  const value = request.parameters[parameter];
  if (typeof value !== "number" || !(value > 0)) throw new RangeError(`parameter ${parameter} is not a duration`);
  return value;
}
