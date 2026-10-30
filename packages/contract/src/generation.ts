import { z } from "zod";

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

// Draft FC8 and FC10 vocabularies and wire shapes (#101). One owner per closed set
// (MODULE §8); `providers`, `compiler`, `spend` and `api` derive from these.

/** The closed operation-class vocabulary (PROVIDERS-AND-MODELS §3; EI3). Audio classes and `world.generate` are reserved and unpopulated. */
export const OPERATION_CLASSES = [
  "video.take",
  "image.frame",
  "image.entity",
  "text.create",
  "text.check",
  "audio.speech",
  "audio.transform",
  "audio.lipsync",
  "audio.voice",
  "audio.transcribe",
  "audio.music-sfx",
  "world.generate",
] as const;
export type OperationClass = (typeof OPERATION_CLASSES)[number];

/** A Model's family (PROVIDERS-AND-MODELS §3). */
export const MODEL_FAMILIES = ["text", "image", "video", "audio"] as const;
/** Lifecycle of an Offering (PROVIDERS-AND-MODELS §10.1): operational overlay, not profile content. */
export const OFFERING_STATUSES = ["candidate", "preview", "active", "deprecated", "suspended", "retired"] as const;
export type OfferingStatus = (typeof OFFERING_STATUSES)[number];
/** Operation kinds an Offering performs (PROVIDERS §4.1 Operations; VOICE-AND-PERFORMANCE §5.1): the kinds the documents name. */
export const OPERATION_KINDS = ["generate", "edit", "reference-edit", "extend", "continue-from-clip", "transform", "speech", "lipsync", "voice-create", "voice-release", "voice-design", "transcribe"] as const;
/** Closed authorisation-precondition kinds (VOICE-AND-PERFORMANCE §5.3; EI3). `unknown` means cloning is unsupported. */
export const AUTHORISATION_KINDS = ["attestation", "speaker-verification", "own-voice-only", "allowlist", "unknown"] as const;
export type AuthorisationKind = (typeof AUTHORISATION_KINDS)[number];
/** Reference roles (GENERATION-PACKAGE §6.1; driving audio `audio.line`, VOICE §5.2). */
export const REFERENCE_ROLES = ["frame.first", "frame.last", "frame.key", "identity", "environment", "composition", "style", "edit.base", "extend.source", "audio.performance", "audio.voice", "audio.line", "added"] as const;
/** Recorded capability limitations with a code the documents name (PROVIDERS §5, §11.2). */
export const KNOWN_LIMITATION_CODES = ["audio-cannot-be-disabled", "line-exceeds-single-call"] as const;
/** How a prompt limit is counted. `utf8-bytes` is an upper bound on tokens for byte-level tokenisers; evidence on the profile says so. */
export const COUNTERS = ["unicode-code-points", "utf8-bytes"] as const;
export type Counter = (typeof COUNTERS)[number];
export const LIMIT_UNITS = ["characters", "tokens"] as const;
/** How references are bound to prose (PROVIDERS §4.1 Reference binding). */
export const REFERENCE_BINDINGS = ["positional-labels", "typed-slots", "role-capped-groups", "none"] as const;
/** Provider prompt rewrites (GENERATION-PACKAGE §10.3). */
export const REWRITE_MODES = ["controllable", "always"] as const;
export const SEED_GUARANTEES = ["none", "best-effort"] as const;
export const PROVIDER_STABILITIES = ["stable", "preview"] as const;
/** What a duration billing basis is (PROVIDERS §4.1 Duration). */
export const BILLED_DURATION_BASES = ["requested", "generated", "set-ceiling"] as const;
export const EXTENSION_OUTPUTS = ["combined", "increment"] as const;
/** Audio fields (PROVIDERS §4.1 Audio; VOICE-AND-PERFORMANCE §5.2). */
export const NATIVE_AUDIO_MODES = ["none", "optional", "always"] as const;
export const VOICE_SOURCES = ["stock", "designed", "cloned"] as const;
export const LIPSYNC_SUBJECTS = ["human", "stylized-humanoid", "any", "unknown"] as const;
export const TIMING_OUTPUTS = ["none", "word", "character"] as const;
export const DRIVING_AUDIO_LENGTH_RULES = ["follows-audio", "fixed-set", "range"] as const;
export const DRIVING_AUDIO_OWN_AUDIO = ["replaced", "mixed", "unknown"] as const;
/** Speech delivery controls and the unit of a per-request length (VOICE-AND-PERFORMANCE §5.2 Speech). */
export const DELIVERY_CONTROLS = ["inline-tags", "instruction", "none"] as const;
export const SPEECH_LENGTH_UNITS = ["characters", "seconds"] as const;
/** Text-family fields (PROVIDERS §13). */
export const STRUCTURED_OUTPUT_MODES = ["schema-constrained", "json-mode", "none"] as const;

/** Text-family layer keys, in canonical order (GENERATION-PACKAGE §14). `source-material` is the creator's original, never `base`. */
export const TEXT_LAYER_KEYS = ["scaffold:operation", "binding", "base", "instruction", "writing-style", "source-material"] as const;
export type TextLayerKey = (typeof TEXT_LAYER_KEYS)[number];
/** Provenance of a layer part (GENERATION-PACKAGE §4.1). */
export const PROVENANCE_KINDS = ["verbatim", "composed", "authored", "scaffold"] as const;
export type ProvenanceKind = (typeof PROVENANCE_KINDS)[number];
/** Operations the compiler has a scaffold for. */
export const PACKAGE_OPERATIONS = ["treatment.draft"] as const;
export type PackageOperation = (typeof PACKAGE_OPERATIONS)[number];
/** Fit outcomes (GENERATION-PACKAGE §7.1, plus `param-adjusted` from PROVIDERS §5). */
export const FIT_OUTCOMES = ["carried", "carried-as-reference", "carried-by", "demoted", "omitted-optional", "param-honored", "param-adjusted", "param-in-text", "param-unsupported", "blocked"] as const;
export type FitOutcome = (typeof FIT_OUTCOMES)[number];
export const FIT_REASONS = ["over-limit", "model-maximum", "undeclared"] as const;
/** Exits of a blocked fit (GENERATION-PACKAGE §7.3). "Send anyway" is not one. */
export const BLOCKED_EXITS = ["another-model", "edit-layer", "disable-optional-layer"] as const;

/** Billed units (BUSINESS-AND-OPERATIONS §4.1). Token-priced text bills input and output separately. */
export const BILLED_UNITS = ["image", "second", "input-token", "output-token"] as const;
export type BilledUnit = (typeof BILLED_UNITS)[number];
export const PRICE_SOURCES = ["looked-up", "published", "observed"] as const;
export const ESTIMATE_UNKNOWN_REASONS = ["no-billed-quantity-rule", "quantity-undetermined", "no-price-entry", "stale-price-entry"] as const;
export const SELECTION_SKIP_REASONS = ["status", "unknown-identity-critical"] as const;
export const SELECTION_SOURCES = ["automatic"] as const;

/** Draft FC8: the Rendered request (GENERATION-PACKAGE §3 step 4). Media layer keys are parameterised (`identity:<presence>`), so the key is a string. */
export const renderedRequestSchema = z.strictObject({
  textParts: z.array(z.strictObject({ layerKey: z.string(), text: z.string(), layerDigest: z.string() })),
  mediaParts: z.array(z.strictObject({ mediaId: z.string(), contentHash: z.string(), role: z.enum(REFERENCE_ROLES), position: z.int().min(0) })),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  /** Provider rewrites that apply to this request (`always`, or `unknown` when undeclared; GENERATION-PACKAGE §10.3). */
  rewrites: z.array(z.string()),
});
export type RenderedRequest = z.infer<typeof renderedRequestSchema>;

/** Versions a compile records (GENERATION-PACKAGE §4.1). */
export const compileVersionsSchema = z.strictObject({
  compiler: z.int().positive(),
  scaffold: z.strictObject({ operation: z.enum(PACKAGE_OPERATIONS), version: z.int().positive() }),
  dialect: z.strictObject({ id: z.string(), version: z.int().positive() }),
  profileSnapshotId: z.string(),
});
export type CompileVersions = z.infer<typeof compileVersionsSchema>;

const blockedExitSchema = z.strictObject({ exit: z.enum(BLOCKED_EXITS), layerKey: z.enum(TEXT_LAYER_KEYS).nullable() });
/** Draft FC8: the Fit report (GENERATION-PACKAGE §7). */
export const fitReportSchema = z.strictObject({
  layers: z.array(z.strictObject({ key: z.enum(TEXT_LAYER_KEYS), tier: z.union([z.literal(0), z.literal(1), z.literal(2)]), outcome: z.enum(FIT_OUTCOMES), reason: z.enum(FIT_REASONS).nullable() })),
  parameters: z.array(z.strictObject({ name: z.string(), outcome: z.enum(FIT_OUTCOMES), requested: z.union([z.string(), z.number(), z.boolean()]), sent: z.union([z.string(), z.number(), z.boolean()]).nullable(), reason: z.enum(FIT_REASONS).nullable() })),
  promptLimit: z.discriminatedUnion("state", [
    z.strictObject({ state: z.literal("declared"), unit: z.enum(LIMIT_UNITS), counter: z.enum(COUNTERS), counted: z.int().min(0), limit: z.int().positive() }),
    z.strictObject({ state: z.literal("declared-none") }),
    z.strictObject({ state: z.literal("unknown") }),
  ]),
  /** A Tier 0 element does not fit, or the limit is unknown (read conservatively, PROVIDERS §4.3). Never "send anyway". */
  blocked: z.discriminatedUnion("reason", [
    z.strictObject({ reason: z.literal("over-limit"), needed: z.int().positive(), limit: z.int().min(0), unit: z.enum(LIMIT_UNITS), exits: z.array(blockedExitSchema) }),
    z.strictObject({ reason: z.literal("limit-unknown"), exits: z.array(blockedExitSchema) }),
  ]).nullable(),
});
export type FitReport = z.infer<typeof fitReportSchema>;

/** Draft FC10: `spend.estimate` (BUSINESS-AND-OPERATIONS §4.2). Money is integer micro-units of the one reporting currency. */
const estimateBasisSchema = z.strictObject({
  requestDigest: z.string(),
  quantities: z.array(z.strictObject({ unit: z.enum(BILLED_UNITS), amount: z.number().min(0), bounds: z.strictObject({ min: z.number().min(0), max: z.number().min(0) }) })),
  entries: z.array(z.strictObject({ unit: z.enum(BILLED_UNITS), per: z.int().positive(), priceMicros: z.int().min(0), confirmedOn: z.iso.date(), source: z.enum(PRICE_SOURCES), stale: z.boolean() })),
});
export const estimateSchema = z.discriminatedUnion("form", [
  z.strictObject({ form: z.literal("point"), currency: z.literal("USD"), amountMicros: z.int().min(0), basis: estimateBasisSchema }),
  z.strictObject({ form: z.literal("range"), currency: z.literal("USD"), minMicros: z.int().min(0), maxMicros: z.int().min(0), basis: estimateBasisSchema }),
  z.strictObject({ form: z.literal("unknown"), reason: z.enum(ESTIMATE_UNKNOWN_REASONS), basis: estimateBasisSchema }),
]);
export type Estimate = z.infer<typeof estimateSchema>;

const selectionReasonSchema = z.discriminatedUnion("code", [
  z.strictObject({ code: z.literal("default-by-policy") }),
  z.strictObject({ code: z.literal("skipped"), modelId: z.string(), reason: z.enum(SELECTION_SKIP_REASONS) }),
]);
export type SelectionReason = z.infer<typeof selectionReasonSchema>;
export const effectiveModelSchema = z.strictObject({
  operationClass: z.enum(OPERATION_CLASSES),
  modelId: z.string(),
  offeringId: z.string(),
  profileSnapshotId: z.string(),
  source: z.enum(SELECTION_SOURCES),
  reasons: z.array(selectionReasonSchema),
});

/** `GET …/source-material/:objectId/treatment-preview`: what Draft Treatment would send and cost. Nothing is created. */
export const treatmentPreviewSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("ready"), effectiveModel: effectiveModelSchema, versions: compileVersionsSchema, renderedRequest: renderedRequestSchema, digest: z.string(), fit: fitReportSchema, estimate: estimateSchema }),
  z.strictObject({ result: z.literal("blocked"), effectiveModel: effectiveModelSchema, versions: compileVersionsSchema, fit: fitReportSchema }),
  z.strictObject({ result: z.literal("unavailable"), operationClass: z.enum(OPERATION_CLASSES), reasons: z.array(selectionReasonSchema) }),
]);
export type TreatmentPreview = z.infer<typeof treatmentPreviewSchema>;

// Draft FC7 and FC9 vocabularies and wire shapes (#102). One owner per closed set (MODULE §8).

/** Job states (JOB-LIFECYCLE §2). There is no `retrying` state. */
export const JOB_STATES = ["waiting", "queued", "submitting", "running", "fetching", "cancelling", "succeeded", "failed", "cancelled"] as const;
export type JobState = (typeof JOB_STATES)[number];
/** Terminal states are absorbing (JOB-LIFECYCLE §1 rule 5). */
export const TERMINAL_JOB_STATES: readonly JobState[] = ["succeeded", "failed", "cancelled"];
/** The two executor families (JOB-LIFECYCLE §2.2). */
export const JOB_CLASSES = ["provider", "local"] as const;
export type JobClass = (typeof JOB_CLASSES)[number];
/** A Generation's stored outcome once it settles (JOB-LIFECYCLE §2.1). "In progress" is derived from its Jobs, never stored. */
export const GENERATION_OUTCOMES = ["succeeded", "failed", "cancelled"] as const;
export type GenerationOutcome = (typeof GENERATION_OUTCOMES)[number];
/** Roles of a call in a Generation's call log (GENERATION-PACKAGE §11). */
export const CALL_ROLES = ["draft", "repair", "check", "partition"] as const;
export type CallRole = (typeof CALL_ROLES)[number];
/** Workflow operations in the `workflows` registry (EI2). */
export const WORKFLOW_OPERATIONS = ["treatment.draft"] as const;
export type WorkflowOperation = (typeof WORKFLOW_OPERATIONS)[number];
/**
 * F3, the dispatch gate (PROVIDERS-AND-MODELS §9): an ordered, closed list of fail-closed clauses, evaluated in this order
 * immediately before `submit`. `authorised` is the reserved last position for voice work (VOICE-AND-PERFORMANCE §2.3, EI7).
 */
export const DISPATCH_GATE_CLAUSES = ["status", "snapshot", "credential", "fit", "inspector-digest", "estimate", "environment", "authorised"] as const;
export type DispatchGateClause = (typeof DISPATCH_GATE_CLAUSES)[number];
/** The injected deployment environment (VERIFICATION §3.2 line 3, build rule R24). */
export const ENVIRONMENTS = ["local", "ci", "staging", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];
/** Guards a Verdict can name (AI-RESPONSIBILITY-MAP §3). Treatment drafting runs G1, G2, G3, G4 and G7 (T0-06). */
export const GUARD_IDS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"] as const;

declare const initiationBrand: unique symbol;
/**
 * Draft FC2: the proof that an authenticated creator command started an operation (AI-map G10; build rule R6).
 * Opaque: it is minted only in `api`, and nothing else may construct or assert one (arch rule R6).
 */
export interface Initiation {
  readonly [initiationBrand]: "Initiation";
  readonly accountId: string;
  readonly creatorId: string;
  /** The client's action id for this intent (JOB-LIFECYCLE §4): never time-derived; the request's idempotency key. */
  readonly actionId: string;
  /** Minted by `api` for the request (VERIFICATION §2.1: the first link of the trace). */
  readonly requestId: string;
  readonly at: string;
}
/** How a Generation records its Initiation (GENERATION-PACKAGE §11 clause 6). */
export const initiationRecordSchema = z.strictObject({ creatorId: z.uuidv4(), actionId: z.string().min(1), requestId: z.uuidv4(), at: z.iso.datetime(), actionGroup: z.uuidv7() });

const capturedInputSchema = z.strictObject({ unit: z.string().min(1), objectId: z.uuidv7(), sequence: z.int().min(1), fingerprint: z.string().min(1) });
/** Draft FC8 wire shape of ResolvedInputs (GENERATION-PACKAGE §3 step 1), as a Generation records it. */
export const resolvedInputsSchema = z.strictObject({
  operation: z.enum(PACKAGE_OPERATIONS),
  sourceMaterial: z.strictObject({ text: z.string(), captured: capturedInputSchema }),
  writingStyle: z.null(),
});
/** Draft FC8 wire shape of the Package (GENERATION-PACKAGE §4.1), as a Generation records it. */
export const packageSchema = z.strictObject({
  operation: z.enum(PACKAGE_OPERATIONS),
  layers: z.array(z.strictObject({
    key: z.enum(TEXT_LAYER_KEYS),
    owner: z.string(),
    tier: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    parts: z.array(z.strictObject({ provenance: z.enum(PROVENANCE_KINDS), text: z.string(), source: z.string().nullable() })),
    sources: z.array(capturedInputSchema),
  })),
  references: z.array(z.never()),
  parameters: z.strictObject({}),
});
const quantitySchema = z.strictObject({ unit: z.enum(BILLED_UNITS), amount: z.number().min(0) });
/** The actual cost, set once at settlement (JOB-LIFECYCLE §4): the provider's reported quantities, priced; unknown when nothing was reported. */
export const actualCostSchema = z.discriminatedUnion("form", [
  z.strictObject({ form: z.literal("reported"), currency: z.literal("USD"), amountMicros: z.int().min(0), quantities: z.array(quantitySchema) }),
  /** Computed from the billed quantity and the price entry when the provider reported no cost (BUSINESS §4.4). */
  z.strictObject({ form: z.literal("computed"), currency: z.literal("USD"), amountMicros: z.int().min(0), quantities: z.array(quantitySchema) }),
  z.strictObject({ form: z.literal("unknown"), billed: z.enum(BILLED) }),
]);
export type ActualCost = z.infer<typeof actualCostSchema>;
/**
 * Draft FC6: the guard Verdict over a model's proposal (MODULE §3.1 `guards`). `pass: true` names the guards that ran;
 * `pass: false` is REJECTED (AI-map §5: nothing is committed, the raw output stays on the call log); `pass: "held"` is
 * HELD (the output is retained for the creator's decision and nothing is committed).
 */
export const verdictSchema = z.discriminatedUnion("pass", [
  z.strictObject({ pass: z.literal(true), guards: z.array(z.enum(GUARD_IDS)) }),
  z.strictObject({ pass: z.literal(false), guard: z.enum(GUARD_IDS), reason: z.string().min(1) }),
  z.strictObject({ pass: z.literal("held"), guard: z.enum(GUARD_IDS), reason: z.string().min(1) }),
]);

/**
 * Draft FC7: the Generation record as the inspector reads it (VERIFICATION §2.1, build rule R22). The trace fields are required:
 * Initiation (request and action ids), Effective model and snapshot, versions, ResolvedInputs, captured inputs with frozen
 * fingerprints, Package, Fit report, Rendered request and digest, estimate, run history per Job, call log, and the outcome
 * with the actual cost and the outputs once settled.
 */
export type Verdict = z.infer<typeof verdictSchema>;

export const generationReadSchema = z.strictObject({
  generationId: z.uuidv7(),
  projectId: z.uuidv7(),
  operation: z.enum(WORKFLOW_OPERATIONS),
  initiation: initiationRecordSchema,
  effectiveModel: effectiveModelSchema,
  versions: compileVersionsSchema,
  /** The profile snapshot's kind was `fake` (VERIFICATION §3.2 line 6). */
  testProvider: z.boolean(),
  resolvedInputs: resolvedInputsSchema,
  captured: z.array(capturedInputSchema).min(1),
  package: packageSchema,
  fit: fitReportSchema,
  renderedRequest: renderedRequestSchema,
  digest: z.string(),
  expectedDigest: z.string().nullable(),
  /** The duplicate guard's key: hash(operation, project, target, Rendered request digest) (JOB-LIFECYCLE §4). Null on a Generation written before migration 7 or by the previous image. */
  inputFingerprint: z.string().min(1).nullable(),
  estimate: estimateSchema,
  target: z.strictObject({ output: z.literal("option"), kind: z.string().min(1) }),
  /** Run history: one entry per Job, kept when Jobs are pruned (JOB-LIFECYCLE §2.1). */
  runs: z.array(z.strictObject({
    jobId: z.uuidv7(),
    run: z.int().min(1),
    state: z.enum(JOB_STATES),
    operationRef: z.string().nullable(),
    failureClass: z.enum(FAILURE_CLASSES).nullable(),
    billed: z.enum(BILLED).nullable(),
    reason: z.string().nullable(),
  })).min(1),
  /** The call log (GENERATION-PACKAGE §11): ordered calls with role, request digest, raw response, verdict and reported cost. */
  calls: z.array(z.strictObject({
    index: z.int().min(1),
    role: z.enum(CALL_ROLES),
    jobId: z.uuidv7(),
    requestDigest: z.string(),
    /** The exact request of a call that is not the Generation's own (the repair call); null for the draft call. */
    renderedRequest: renderedRequestSchema.nullable(),
    operationRef: z.string().nullable(),
    response: z.string().nullable(),
    verdict: verdictSchema.nullable(),
    reportedCost: z.array(quantitySchema).nullable(),
  })),
  outcome: z.strictObject({
    outcome: z.enum(GENERATION_OUTCOMES),
    reason: z.string().nullable(),
    actual: actualCostSchema,
    outputs: z.array(z.strictObject({ kind: z.literal("option"), objectId: z.uuidv7(), sequence: z.int().min(1) })),
    settledAt: z.iso.datetime(),
  }).nullable(),
  createdAt: z.iso.datetime(),
});
export type GenerationRead = z.infer<typeof generationReadSchema>;

/** `POST …/source-material/:objectId/treatment-drafts`: the creator's command. `expectedDigest` is the digest the inspector showed, if open. */
export const draftTreatmentSchema = z.strictObject({ expectedDigest: z.string().min(1).optional() });
/** Its answer: the Generation (settled on the text fast path, or still in progress), or the preview's blocked and unavailable results, which create nothing. */
export const draftTreatmentResultSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("generation"), generation: generationReadSchema }),
  z.strictObject({ result: z.literal("blocked"), effectiveModel: effectiveModelSchema, versions: compileVersionsSchema, fit: fitReportSchema }),
  z.strictObject({ result: z.literal("unavailable"), operationClass: z.enum(OPERATION_CLASSES), reasons: z.array(selectionReasonSchema) }),
  /** Refused at creation, before any Generation exists (T0-06). A creator cap offers Raise the cap, Trim or Not now, never Start (BUSINESS §6.1). */
  z.strictObject({ result: z.literal("cap-reached"), cap: z.enum(["daily", "monthly", "action"]), remainingMicros: z.int().min(0) }),
  /** The hidden operator ceiling: a limit on the studio, not on the creator's content (BUSINESS §6.2). */
  z.strictObject({ result: z.literal("studio-limit") }),
  /** An unknown price has no upper bound to admit against (BUSINESS §3). */
  z.strictObject({ result: z.literal("price-unknown") }),
  /** An identical request is already in progress (JOB-LIFECYCLE §4). A different action id does not make it a new request. */
  z.strictObject({ result: z.literal("already-generating"), generationId: z.uuidv7() }),
]);
export type DraftTreatmentResult = z.infer<typeof draftTreatmentResultSchema>;
