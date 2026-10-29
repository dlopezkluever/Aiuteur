import {
  TEXT_LAYER_KEYS,
  type CompileVersions, type FitReport, type PackageOperation, type ProvenanceKind, type RenderedRequest, type TextLayerKey,
} from "@aiuteur/contract";
import { canonicalJson, count, dialectFor, render, sha256, wrap, type Dialect, type ProfileSnapshot } from "@aiuteur/providers";
import { REPAIR_SCAFFOLD, SCAFFOLDS } from "./scaffold.ts";

// Draft FC8 (GENERATION-PACKAGE §3–§10; MODULE §3.3). One compiler, pure: no storage, clock,
// randomness, network, transport or mutable configuration. Same ResolvedInputs, profile
// snapshot and versions give a byte-identical Rendered request. Compose builds layers; Fit
// carries, omits whole layers by tier with a reason, or blocks, and never cuts inside a layer;
// Render applies the dialect named by the profile. Nothing here names a vendor.

export { REPAIR_SCAFFOLD, SCAFFOLDS } from "./scaffold.ts";
export type { RenderedRequest } from "@aiuteur/contract";

/** Bumped when compiler code changes the Rendered request for an unchanged input (VC2). */
export const COMPILER_VERSION = 1;

/** A captured input: the unit read, its Revision and its frozen fingerprint (LINEAGE §3.3). */
export interface CapturedInput {
  readonly unit: string;
  readonly objectId: string;
  readonly sequence: number;
  readonly fingerprint: string;
}

/** Draft FC8: an immutable snapshot of owned truth for one compile (GENERATION-PACKAGE §3 step 1). */
export interface ResolvedInputs {
  readonly operation: PackageOperation;
  /** The creator's original material: its own layer, never `base` (#101 decision 1). */
  readonly sourceMaterial: { readonly text: string; readonly captured: CapturedInput };
  /** EI11: reserved. No Writing Style kind exists until VS2, so the layer is absent and nothing is synthesised. */
  readonly writingStyle: null;
}

export interface LayerPart {
  readonly provenance: ProvenanceKind;
  readonly text: string;
  /** The captured unit a verbatim part reproduces, or null. */
  readonly source: string | null;
}
export type Tier = 0 | 1 | 2;
export interface Layer {
  readonly key: TextLayerKey;
  readonly owner: string;
  readonly tier: Tier;
  readonly parts: readonly LayerPart[];
  readonly sources: readonly CapturedInput[];
}
/** Draft FC8: the Package (GENERATION-PACKAGE §4.1). Text Packages carry no references. */
export interface Package {
  readonly operation: PackageOperation;
  readonly layers: readonly Layer[];
  readonly references: readonly never[];
  readonly parameters: Readonly<Record<string, never>>;
}

/**
 * The text layer catalog, in canonical order (GENERATION-PACKAGE §14). Single owner. Tiers follow
 * §7.2 by analogy: Facts bind (Tier 0), the base and the creator's instruction are context and words
 * that are never cut (Tier 0, §14 "context that does not fit is not truncated"), Writing Style is
 * Tier 1 (#101 decision 3), and the Source Material the operation drafts from is Tier 0.
 */
export const TEXT_LAYER_CATALOG: Readonly<Record<TextLayerKey, { readonly owner: string; readonly tier: Tier }>> = Object.freeze({
  "scaffold:operation": { owner: "compiler scaffold", tier: 0 },
  binding: { owner: "Established Facts", tier: 0 },
  base: { owner: "the document operated on", tier: 0 },
  instruction: { owner: "the creator, for this Generation", tier: 0 },
  "writing-style": { owner: "Writing Style Revision", tier: 1 },
  "source-material": { owner: "Source Material", tier: 0 },
});

export const layerText = (layer: Layer): string => layer.parts.map((part) => part.text).join("");

function layer(key: TextLayerKey, parts: readonly LayerPart[], sources: readonly CapturedInput[]): Layer {
  return { key, ...TEXT_LAYER_CATALOG[key], parts, sources };
}

/** Compose (§3 step 2): ResolvedInputs to a Package. A layer with nothing to say is absent. */
export function compose(inputs: ResolvedInputs): Package {
  const { captured } = inputs.sourceMaterial;
  const layers = [
    layer("scaffold:operation", [{ provenance: "scaffold", text: SCAFFOLDS[inputs.operation].text, source: null }], []),
    layer("source-material", [{ provenance: "verbatim", text: inputs.sourceMaterial.text, source: `${captured.objectId}@${captured.sequence}` }], [captured]),
  ];
  const order = (l: Layer) => TEXT_LAYER_KEYS.indexOf(l.key);
  return { operation: inputs.operation, layers: layers.sort((a, b) => order(a) - order(b)), references: [], parameters: {} };
}

export interface Fitted {
  readonly carried: readonly Layer[];
  readonly parameters: RenderedRequest["parameters"];
  readonly rewrites: readonly string[];
  readonly report: FitReport;
}

function dialectOf(profile: ProfileSnapshot): Dialect {
  const dialect = dialectFor(profile.dialect);
  // Unreachable for a Catalogue profile: an unknown dialect is refused at load (F10).
  if (!dialect) throw new Error(`profile ${profile.snapshotId} names an unknown dialect`);
  return dialect;
}

/**
 * Fit (§7): a defined result for every Package and profile. Layers are carried whole or omitted
 * whole, lowest tier first and, within a tier, from the end of the canonical order; Tier 0 is
 * never omitted. If Tier 0 alone is over the limit, or the limit is unknown, the fit is blocked.
 */
export function fit(pkg: Package, profile: ProfileSnapshot): Fitted {
  const dialect = dialectOf(profile);
  const parameters: Record<string, string | number | boolean> = {};
  const paramReport: FitReport["parameters"] = [];
  const output = profile.limits.output;
  if (output.state === "declared") {
    parameters["maxOutputTokens"] = output.value.max;
    paramReport.push({ name: "maxOutputTokens", outcome: "param-honored", requested: output.value.max, sent: output.value.max, reason: "model-maximum" });
  } else {
    paramReport.push({ name: "maxOutputTokens", outcome: "param-unsupported", requested: "model-maximum", sent: null, reason: "undeclared" });
  }
  const rewrites = profile.controls.rewrites;
  const applied: string[] = [];
  if (rewrites.state === "unknown") applied.push("undeclared-provider-rewrite");
  for (const rewrite of rewrites.state === "declared" ? rewrites.value : []) {
    if (rewrite.mode === "controllable" && rewrite.disableParameter !== null) {
      parameters[rewrite.disableParameter] = false;
      paramReport.push({ name: rewrite.disableParameter, outcome: "param-honored", requested: false, sent: false, reason: null });
    } else applied.push(rewrite.name);
  }

  const outcomes = new Map<TextLayerKey, { outcome: FitReport["layers"][number]["outcome"]; reason: FitReport["layers"][number]["reason"] }>();
  let carried = [...pkg.layers];
  const report = (blocked: FitReport["blocked"], promptLimit: FitReport["promptLimit"]): FitReport => ({
    layers: pkg.layers.map((l) => ({ key: l.key, tier: l.tier, ...(outcomes.get(l.key) ?? { outcome: blocked ? "blocked" : "carried", reason: blocked?.reason === "over-limit" ? "over-limit" : null }) })),
    parameters: paramReport,
    promptLimit,
    blocked,
  });
  const exits = (): NonNullable<FitReport["blocked"]>["exits"] => [
    { exit: "another-model", layerKey: null },
    ...carried.filter((l) => l.tier === 0 && l.key !== "binding").map((l) => ({ exit: "edit-layer" as const, layerKey: l.key })),
  ];
  const limit = profile.limits.prompt;
  if (limit.state === "declared-none") return { carried, parameters, rewrites: applied, report: report(null, { state: "declared-none" }) };
  if (limit.state === "unknown") return { carried, parameters, rewrites: applied, report: report({ reason: "limit-unknown", exits: exits() }, { state: "unknown" }) };

  const { counter, max, margin, unit } = limit.value;
  const room = max - margin;
  const measure = (layers: readonly Layer[]) => layers.reduce((n, l) => n + count(wrap(dialect, l.key, layerText(l)), counter), 0);
  while (measure(carried) > room) {
    const order = (l: Layer) => TEXT_LAYER_KEYS.indexOf(l.key);
    const [drop] = carried.filter((l) => l.tier > 0).sort((a, b) => b.tier - a.tier || order(b) - order(a));
    if (!drop) {
      const needed = measure(carried);
      return { carried, parameters, rewrites: applied, report: report({ reason: "over-limit", needed, limit: room, unit, exits: exits() }, { state: "declared", unit, counter, counted: needed, limit: room }) };
    }
    outcomes.set(drop.key, { outcome: "omitted-optional", reason: "over-limit" });
    carried = carried.filter((l) => l !== drop);
  }
  return { carried, parameters, rewrites: applied, report: report(null, { state: "declared", unit, counter, counted: measure(carried), limit: room }) };
}

export type CompileResult =
  | { readonly result: "fitted"; readonly package: Package; readonly fit: FitReport; readonly renderedRequest: RenderedRequest; readonly digest: string; readonly versions: CompileVersions }
  | { readonly result: "blocked"; readonly package: Package; readonly fit: FitReport; readonly versions: CompileVersions };

/** The digest of a Rendered request: what P1, the estimate and the duplicate guard all name. */
export const requestDigest = (request: RenderedRequest): string => sha256(canonicalJson(request));

/** FC8 `compile(ResolvedInputs, ProfileSnapshot)`: Compose, Fit, Render. A blocked fit has no request. */
export function compile(inputs: ResolvedInputs, profile: ProfileSnapshot): CompileResult {
  const pkg = compose(inputs);
  const fitted = fit(pkg, profile);
  const versions: CompileVersions = {
    compiler: COMPILER_VERSION,
    scaffold: { operation: inputs.operation, version: SCAFFOLDS[inputs.operation].version },
    dialect: { id: profile.dialect.id, version: profile.dialect.version },
    profileSnapshotId: profile.snapshotId,
  };
  if (fitted.report.blocked) return { result: "blocked", package: pkg, fit: fitted.report, versions };
  const renderedRequest = render(dialectOf(profile), {
    layers: fitted.carried.map((l) => ({ key: l.key, text: layerText(l) })),
    parameters: fitted.parameters,
    rewrites: fitted.rewrites,
  });
  return { result: "fitted", package: pkg, fit: fitted.report, renderedRequest, digest: requestDigest(renderedRequest), versions };
}

/**
 * The Rendered request of the single repair call (AI-map §5): the Generation's own request plus one `repair` part naming the
 * refusing guard and carrying the refused response. Prompt text exists only as compiler output (build rule R-prompt).
 */
export function repairRequest(request: RenderedRequest, profile: ProfileSnapshot, previous: string, failure: { readonly guard: string; readonly reason: string }): RenderedRequest {
  const text = REPAIR_SCAFFOLD.text(failure, previous);
  return { ...request, textParts: [...request.textParts, { layerKey: "repair", text: wrap(dialectOf(profile), "repair", text), layerDigest: sha256(text) }] };
}
