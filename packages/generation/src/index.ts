import type { TreatmentPreview } from "@aiuteur/contract";
import { compile, type ResolvedInputs } from "@aiuteur/compiler";
import type { EffectiveModel, PriceEntry, ProfileSnapshot } from "@aiuteur/providers";
import { estimate, type PricePolicy } from "@aiuteur/spend";

// `generation.preview` (MODULE §3.3, §6 step 3; GENERATION-PACKAGE §3, guard P11): compile and
// estimate, and write nothing. It takes no Store, no transaction and no transport, so it cannot
// create a Generation, a Job or a spend record. Creation, admission and dispatch are #102's.

export interface PreviewInput {
  readonly inputs: ResolvedInputs;
  readonly effective: EffectiveModel;
  readonly profile: ProfileSnapshot;
  readonly prices: readonly PriceEntry[];
  readonly today: string;
  readonly pricePolicy: PricePolicy;
}

export type Preview = Exclude<TreatmentPreview, { result: "unavailable" }>;

/** One compile; the estimate prices that compile's Rendered request and names its digest. */
export function preview(input: PreviewInput): Preview {
  const compiled = compile(input.inputs, input.profile);
  const effectiveModel = { ...input.effective, reasons: [...input.effective.reasons] };
  if (compiled.result === "blocked") return { result: "blocked", effectiveModel, versions: compiled.versions, fit: compiled.fit };
  return {
    result: "ready",
    effectiveModel,
    versions: compiled.versions,
    renderedRequest: compiled.renderedRequest,
    digest: compiled.digest,
    fit: compiled.fit,
    estimate: estimate({ request: compiled.renderedRequest, digest: compiled.digest, rule: input.profile.cost.billedQuantity, entries: input.prices, today: input.today, policy: input.pricePolicy }),
  };
}
