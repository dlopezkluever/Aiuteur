import type { Estimate, RenderedRequest } from "@aiuteur/contract";
import { billedQuantities, type BilledQuantity, type BilledQuantityRule, type Declared, type PriceEntry } from "@aiuteur/providers";

// Draft FC10 `spend.estimate` (BUSINESS-AND-OPERATIONS §4.2, §4.3; MODULE §3.3). Read-only and
// computed from the Rendered request itself, so the price and the request cannot describe
// different things. No admission, caps, confirmation or spend record (`spend.admit` is #102's).

/** Staleness of published prices (BUSINESS §4.3): tunable configuration, not architecture. */
export interface PricePolicy {
  /** Past this age the estimate widens to a range by the drift allowance. */
  readonly widenAfterDays: number;
  /** Past this age the entry is unusable and the estimate is unknown. */
  readonly unknownAfterDays: number;
  /** Drift allowance in parts per thousand. */
  readonly driftPermille: number;
}

export interface EstimateInput {
  readonly request: RenderedRequest;
  /** The digest of `request`, recorded so the estimate names the request it priced. */
  readonly digest: string;
  readonly rule: Declared<BilledQuantityRule>;
  readonly entries: readonly PriceEntry[];
  /** Today's date (ISO), from the injected clock. */
  readonly today: string;
  readonly policy: PricePolicy;
}

const DAY = 86_400_000;
const ageDays = (confirmedOn: string, today: string) => Math.floor((Date.parse(today) - Date.parse(confirmedOn)) / DAY);

/** Point when the request determines the cost; Range when it does not or a price is ageing; Unknown when no usable entry exists. */
export function estimate(input: EstimateInput): Estimate {
  const basis = { requestDigest: input.digest, quantities: [] as BilledQuantity[], entries: [] as Estimate["basis"]["entries"] };
  if (input.rule.state !== "declared") return { form: "unknown", reason: "no-billed-quantity-rule", basis };
  try {
    basis.quantities = billedQuantities(input.rule.value, input.request);
  } catch (error) {
    if (error instanceof RangeError) return { form: "unknown", reason: "quantity-undetermined", basis };
    throw error;
  }
  let min = 0;
  let max = 0;
  let widened = false;
  for (const quantity of basis.quantities) {
    const entry = input.entries.find((e) => e.unit === quantity.unit);
    if (!entry) return { form: "unknown", reason: "no-price-entry", basis };
    const age = ageDays(entry.confirmedOn, input.today);
    const stale = age > input.policy.widenAfterDays;
    basis.entries.push({ unit: entry.unit, per: entry.per, priceMicros: entry.priceMicros, confirmedOn: entry.confirmedOn, source: entry.source, stale });
    if (age > input.policy.unknownAfterDays) return { form: "unknown", reason: "stale-price-entry", basis };
    widened ||= stale;
    min += Math.floor((quantity.bounds.min * entry.priceMicros) / entry.per);
    max += Math.ceil((quantity.bounds.max * entry.priceMicros) / entry.per);
  }
  if (widened) {
    min = Math.floor((min * (1000 - input.policy.driftPermille)) / 1000);
    max = Math.ceil((max * (1000 + input.policy.driftPermille)) / 1000);
  }
  // Token-priced text is a Range by rule (BUSINESS §4.2; #101 decision 5), even when its bounds coincide.
  const exact = !widened && input.rule.value.rule !== "text-tokens" && basis.quantities.every((q) => q.bounds.min === q.bounds.max);
  return exact ? { form: "point", currency: "USD", amountMicros: max, basis } : { form: "range", currency: "USD", minMicros: min, maxMicros: max, basis };
}
