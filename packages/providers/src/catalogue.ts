import { z } from "zod";
import {
  BILLED_UNITS, OFFERING_STATUSES, OPERATION_CLASSES, PRICE_SOURCES,
  type BilledUnit, type OfferingStatus, type OperationClass, type SelectionReason,
} from "@aiuteur/contract";
import { dialectFor } from "./dialect.ts";
import { profileContentSchema, snapshotProfile, type ProfileContent, type ProfileSnapshot } from "./profile.ts";

// Draft FC10 catalogue face (PROVIDERS-AND-MODELS §3, §8, §9 F10; MODULE §3.3). Pure.
// A Catalogue exists only as the result of `loadCatalogue`, so invalid data fails at load,
// never at first use. Product code reasons in Model, Offering, snapshot, operation class
// and selection reason; vendor wire identifiers stay in Catalogue data and adapters.

/** A price entry (BUSINESS-AND-OPERATIONS §4.1): `priceMicros` of the reporting currency per `per` units. */
export const priceEntrySchema = z.strictObject({
  offeringId: z.string().min(1),
  operationClass: z.enum(OPERATION_CLASSES),
  unit: z.enum(BILLED_UNITS),
  per: z.int().positive(),
  priceMicros: z.int().min(0),
  confirmedOn: z.iso.date(),
  source: z.enum(PRICE_SOURCES),
});
export type PriceEntry = z.infer<typeof priceEntrySchema>;

const catalogueDataSchema = z.strictObject({
  offerings: z.array(z.strictObject({ status: z.enum(OFFERING_STATUSES), profile: profileContentSchema })).min(1),
  /** The operator's curated quality rank per class, best first, by Model id (PROVIDERS §8.3). */
  ranking: z.partialRecord(z.enum(OPERATION_CLASSES), z.array(z.string().min(1))),
  priceEntries: z.array(priceEntrySchema),
});

export interface CatalogueOffering {
  /** Operational overlay (PROVIDERS §10.1): not snapshot content. */
  readonly status: OfferingStatus;
  readonly profile: ProfileSnapshot;
}
declare const catalogueBrand: unique symbol;
export interface Catalogue {
  readonly [catalogueBrand]: "Catalogue";
  readonly offerings: readonly CatalogueOffering[];
  readonly ranking: Readonly<Partial<Record<OperationClass, readonly string[]>>>;
  readonly priceEntries: readonly PriceEntry[];
}

/** Invalid Catalogue data (F10). `issues` names every failed rule. */
export class CatalogueInvalid extends Error {
  readonly issues: readonly string[];
  constructor(issues: readonly string[]) {
    super(`invalid Catalogue: ${issues.join("; ")}`);
    this.issues = issues;
  }
}

/** The cross-field rules of one profile (PROVIDERS §4, §9 F10; VOICE-AND-PERFORMANCE §2.4, §5.3). */
export function profileIssues(p: ProfileContent): string[] {
  const issues: string[] = [];
  const at = (rule: string) => issues.push(`${p.offeringId}: ${rule}`);
  if (dialectFor(p.dialect) === undefined) at(`dialect ${p.dialect.id}@${p.dialect.version} is not known`);
  if (new Set(p.operationClasses).size !== p.operationClasses.length) at("operation classes repeat");
  for (const c of p.operationClasses) {
    if (c !== "world.generate" && c.split(".")[0] !== p.family) at(`operation class ${c} is not of family ${p.family}`);
  }
  if (p.duration.state === "declared") {
    const d = p.duration.value;
    if (d.kind === "set") {
      if (new Set(d.members).size !== d.members.length) at("duration set repeats a member");
      if (!d.members.includes(d.default)) at(`default duration ${d.default} is outside its declared set`);
    } else {
      if (d.min > d.max) at("duration minimum is above its maximum");
      const steps = (d.default - d.min) / d.step;
      if (d.default < d.min || d.default > d.max || Math.abs(steps - Math.round(steps)) > 1e-9) at(`default duration ${d.default} is outside its declared range`);
    }
  }
  if (p.extension.state === "declared" && p.duration.state !== "declared") at("extension is declared without a base duration");
  const prompt = p.limits.prompt.state === "declared" ? p.limits.prompt.value : undefined;
  if (prompt && prompt.margin >= prompt.max) at("prompt safety margin leaves no room under the limit");
  const rule = p.cost.billedQuantity.state === "declared" ? p.cost.billedQuantity.value : undefined;
  if (rule?.rule === "text-tokens") {
    if (p.family !== "text") at("a token rule needs the text family");
    if (prompt && prompt.counter !== rule.counter) at("the token rule counts with a different counter than the prompt limit");
    const output = p.limits.output.state === "declared" ? p.limits.output.value : undefined;
    if (!output) at("a token rule needs a declared maximum output");
    else if (rule.outputMin > output.max) at("the token rule's output minimum is above the maximum output");
  }
  if ((rule?.rule === "duration-requested" || rule?.rule === "duration-set-ceiling") && p.duration.state !== "declared") at("a duration billing rule needs a declared duration");
  const sources = p.audio.voiceSources.state === "declared" ? p.audio.voiceSources.value : [];
  if (sources.includes("cloned")) {
    if (!(p.audio.deleteVoice.state === "declared" && p.audio.deleteVoice.value)) at("a cloning Offering must declare delete voice");
    const requirement = p.audio.voiceSourceRequirement;
    if (requirement.state !== "declared" || requirement.value === "unknown") at("a cloning Offering must declare a known authorisation precondition");
  }
  return issues;
}

/** The units a billed-quantity rule can produce. */
function unitsOf(p: ProfileContent): readonly BilledUnit[] {
  if (p.cost.billedQuantity.state !== "declared") return [];
  const rule = p.cost.billedQuantity.value;
  return rule.rule === "text-tokens" ? ["input-token", "output-token"] : [rule.unit];
}

/** Validates Catalogue data in full (schema, then every cross-field rule) and snapshots each profile. Throws CatalogueInvalid. */
export function loadCatalogue(data: unknown): Catalogue {
  const parsed = catalogueDataSchema.safeParse(data);
  if (!parsed.success) throw new CatalogueInvalid(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
  const { offerings, ranking, priceEntries } = parsed.data;
  const issues = offerings.flatMap((o) => profileIssues(o.profile));
  const byId = new Map<string, ProfileContent>();
  for (const { profile } of offerings) {
    if (byId.has(profile.offeringId)) issues.push(`offering ${profile.offeringId} is listed twice`);
    byId.set(profile.offeringId, profile);
  }
  for (const [operationClass, models] of Object.entries(ranking)) {
    for (const model of models ?? []) {
      if (!offerings.some((o) => o.profile.modelId === model && o.profile.operationClasses.includes(operationClass as OperationClass))) issues.push(`ranking for ${operationClass} names ${model}, which has no Offering of that class`);
    }
  }
  const seen = new Set<string>();
  for (const entry of priceEntries) {
    const key = `${entry.offeringId}|${entry.operationClass}|${entry.unit}`;
    const profile = byId.get(entry.offeringId);
    if (!profile) issues.push(`price entry for unknown offering ${entry.offeringId}`);
    else if (!profile.operationClasses.includes(entry.operationClass)) issues.push(`price entry for ${entry.offeringId} names class ${entry.operationClass}, which it does not perform`);
    else if (!unitsOf(profile).includes(entry.unit)) issues.push(`price entry for ${entry.offeringId} prices ${entry.unit}, which its rule never bills`);
    if (seen.has(key)) issues.push(`price entry ${key} is listed twice`);
    seen.add(key);
  }
  if (issues.length > 0) throw new CatalogueInvalid(issues);
  return Object.freeze({
    offerings: Object.freeze(offerings.map((o) => Object.freeze({ status: o.status, profile: snapshotProfile(o.profile) }))),
    ranking: Object.freeze(ranking),
    priceEntries: Object.freeze(priceEntries),
  }) as unknown as Catalogue;
}

/** Fields whose `unknown` keeps an Offering out of Automatic (PROVIDERS §4.3). */
function unknownIdentityCritical(p: ProfileContent): boolean {
  return [p.limits.prompt, p.cost.billedQuantity, p.duration, p.output].some((field) => field.state === "unknown");
}

export interface EffectiveModel {
  readonly operationClass: OperationClass;
  readonly modelId: string;
  readonly offeringId: string;
  readonly profileSnapshotId: string;
  readonly source: "automatic";
  readonly reasons: readonly SelectionReason[];
}
export type Selection =
  | { readonly result: "selected"; readonly effective: EffectiveModel; readonly profile: ProfileSnapshot }
  | { readonly result: "unavailable"; readonly operationClass: OperationClass; readonly reasons: readonly SelectionReason[] };

/**
 * Automatic selection for one operation class (PROVIDERS §8.3), as far as the T0 text preview
 * needs it: status and unknown identity-critical fields filter; the curated rank orders; ties
 * break by Model then Offering id. No overrides, credentials, needs filter or substitution yet.
 */
export function select(catalogue: Catalogue, operationClass: OperationClass): Selection {
  const reasons: SelectionReason[] = [];
  const eligible: CatalogueOffering[] = [];
  for (const offering of catalogue.offerings.filter((o) => o.profile.operationClasses.includes(operationClass))) {
    const reason = offering.status !== "active" ? "status" : unknownIdentityCritical(offering.profile) ? "unknown-identity-critical" : null;
    if (reason) reasons.push({ code: "skipped", modelId: offering.profile.modelId, reason });
    else eligible.push(offering);
  }
  const rank = catalogue.ranking[operationClass] ?? [];
  const position = (model: string) => (rank.includes(model) ? rank.indexOf(model) : rank.length);
  const [chosen] = eligible.sort((a, b) =>
    position(a.profile.modelId) - position(b.profile.modelId) ||
    compare(a.profile.modelId, b.profile.modelId) || compare(a.profile.offeringId, b.profile.offeringId));
  if (!chosen) return { result: "unavailable", operationClass, reasons };
  const { profile } = chosen;
  return {
    result: "selected",
    profile,
    effective: { operationClass, modelId: profile.modelId, offeringId: profile.offeringId, profileSnapshotId: profile.snapshotId, source: "automatic", reasons: [{ code: "default-by-policy" }, ...reasons] },
  };
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The price entries of one Offering for one class (BUSINESS §4.1). */
export function priceEntries(catalogue: Catalogue, offeringId: string, operationClass: OperationClass): readonly PriceEntry[] {
  return catalogue.priceEntries.filter((e) => e.offeringId === offeringId && e.operationClass === operationClass);
}
