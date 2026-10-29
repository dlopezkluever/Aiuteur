import { z } from "zod";

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
