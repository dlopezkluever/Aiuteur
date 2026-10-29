import { actualCostSchema, estimateSchema, type ActualCost, type Billed, type Estimate, type RenderedRequest } from "@aiuteur/contract";
import { billedQuantities, type BilledQuantity, type BilledQuantityRule, type Declared, type PriceEntry } from "@aiuteur/providers";

// Draft FC10 `spend.estimate` (BUSINESS-AND-OPERATIONS §4.2, §4.3; MODULE §3.3). Read-only and
// computed from the Rendered request itself, so the price and the request cannot describe
// different things. `admit` (T0-06) is the creation-time spend check; there is no balance, ledger or reservation.

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

/**
 * The actual cost of one run, set once at settlement (JOB-LIFECYCLE §4): the provider's reported quantities priced by the
 * Offering's entries. Nothing reported, or a unit with no entry, is `unknown` with what is known about billing.
 */
export function actual(reported: readonly { readonly unit: BilledQuantity["unit"]; readonly amount: number }[] | null, entries: readonly PriceEntry[], billed: Billed): ActualCost {
  if (reported === null) return { form: "unknown", billed };
  let amountMicros = 0;
  for (const quantity of reported) {
    const entry = entries.find((e) => e.unit === quantity.unit);
    if (!entry) return { form: "unknown", billed };
    amountMicros += Math.ceil((quantity.amount * entry.priceMicros) / entry.per);
  }
  return { form: "reported", currency: "USD", amountMicros, quantities: reported.map((q) => ({ unit: q.unit, amount: q.amount })) };
}

/** Creator caps and the hidden operator ceiling, in micro-units per account calendar period. Configuration with no default (BUSINESS §9); null means no limit. */
export interface Caps {
  readonly creator: { readonly dailyMicros: number | null; readonly monthlyMicros: number | null; readonly perActionMicros: number | null };
  /** Applies to operator-paid spend only, which is all spend until BYOK (BUSINESS §6.2). */
  readonly ceiling: { readonly dailyMicros: number | null; readonly monthlyMicros: number | null };
}

/** What the committed-spend rule reads of one Generation. */
export interface SpendFact { readonly createdAt: string; readonly estimate: unknown; readonly actual: unknown | null }

const upperBound = (estimate: Estimate): number | null => (estimate.form === "point" ? estimate.amountMicros : estimate.form === "range" ? estimate.maxMicros : null);

/**
 * What one Generation counts toward committed spend (BUSINESS §5.3, §6.3): its approved estimate while unsettled, then its
 * actual cost; a settled run known not to be billed counts nothing, and one that may have been billed counts its estimate.
 */
function committed(fact: SpendFact): number {
  const upper = upperBound(estimateSchema.parse(fact.estimate)) ?? 0;
  if (fact.actual === null) return upper;
  const actual = actualCostSchema.parse(fact.actual);
  if (actual.form === "reported") return actual.amountMicros;
  return actual.billed === "no" ? 0 : upper;
}

/** The start of the UTC calendar day and month containing `now`. Accounts carry no timezone yet, so periods are UTC (spec-level). */
export function periodStarts(now: number): { readonly day: string; readonly month: string } {
  const d = new Date(now);
  return { day: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString(), month: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString() };
}

export type Admission =
  | { readonly result: "admitted" }
  /** A creator cap: the creator's own guard. What is left is shown; the offers are Raise the cap, Trim or Not now, never Start. */
  | { readonly result: "refused"; readonly reason: "creator-cap"; readonly cap: "daily" | "monthly" | "action"; readonly remainingMicros: number }
  /** The hidden operator ceiling: a limit on the studio, not on the creator's content. */
  | { readonly result: "refused"; readonly reason: "studio-limit" }
  /** An unknown price has no upper bound to test, so it cannot be admitted (BUSINESS §3). */
  | { readonly result: "refused"; readonly reason: "price-unknown" };

/**
 * FC10 `spend.admit` (BUSINESS §6.3). Allowed when committed spend for the period plus this action's upper-bound estimate stays
 * within the creator's cap and the operator ceiling. The caller runs it in the transaction that creates the Generation, under
 * the Account's write lock, with every Generation of the Account since the month began (`facts`), so concurrent creations
 * cannot jointly exceed a limit. The ceiling is tested first: raising a creator cap cannot clear it.
 */
export function admit(input: { readonly estimate: Estimate; readonly facts: readonly SpendFact[]; readonly now: number; readonly caps: Caps }): Admission {
  const upper = upperBound(input.estimate);
  if (upper === null) return { result: "refused", reason: "price-unknown" };
  const since = periodStarts(input.now);
  const spent = (from: string) => input.facts.filter((f) => f.createdAt >= from).reduce((sum, f) => sum + committed(f), 0);
  const day = spent(since.day);
  const month = spent(since.month);
  const { ceiling, creator } = input.caps;
  if ((ceiling.dailyMicros !== null && day + upper > ceiling.dailyMicros) || (ceiling.monthlyMicros !== null && month + upper > ceiling.monthlyMicros)) return { result: "refused", reason: "studio-limit" };
  if (creator.perActionMicros !== null && upper > creator.perActionMicros) return { result: "refused", reason: "creator-cap", cap: "action", remainingMicros: creator.perActionMicros };
  if (creator.dailyMicros !== null && day + upper > creator.dailyMicros) return { result: "refused", reason: "creator-cap", cap: "daily", remainingMicros: Math.max(0, creator.dailyMicros - day) };
  if (creator.monthlyMicros !== null && month + upper > creator.monthlyMicros) return { result: "refused", reason: "creator-cap", cap: "monthly", remainingMicros: Math.max(0, creator.monthlyMicros - month) };
  return { result: "admitted" };
}
