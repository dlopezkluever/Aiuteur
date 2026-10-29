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
 * The actual cost, set once at settlement (JOB-LIFECYCLE §4; BUSINESS §4.4): what the provider reported, priced by the Offering's
 * entries; else, when the run is known to have been billed, COMPUTED from the nominal billed quantities and the same entries;
 * else unknown with what is known about billing.
 */
export function actual(reported: readonly Quantity[] | null, entries: readonly PriceEntry[], billed: Billed, nominal: readonly Quantity[] | null = null): ActualCost {
  const price = (quantities: readonly Quantity[]) => {
    let amountMicros = 0;
    for (const quantity of quantities) {
      const entry = entries.find((e) => e.unit === quantity.unit);
      if (!entry) return null;
      amountMicros += Math.ceil((quantity.amount * entry.priceMicros) / entry.per);
    }
    return { amountMicros, quantities: quantities.map((q) => ({ unit: q.unit, amount: q.amount })) };
  };
  if (reported !== null) {
    const priced = price(reported);
    return priced ? { form: "reported", currency: "USD", ...priced } : { form: "unknown", billed };
  }
  const computed = billed === "yes" && nominal !== null && nominal.length > 0 ? price(nominal) : null;
  return computed ? { form: "computed", currency: "USD", ...computed } : { form: "unknown", billed };
}
type Quantity = { readonly unit: BilledQuantity["unit"]; readonly amount: number };

/** Creator caps and the hidden operator ceiling, in micro-units per account calendar period. Configuration with no default (BUSINESS §9); null means no limit. */
export interface Caps {
  readonly creator: { readonly dailyMicros: number | null; readonly monthlyMicros: number | null; readonly perActionMicros: number | null };
  /** Applies to operator-paid spend only, which is all spend until BYOK (BUSINESS §6.2). */
  readonly ceiling: { readonly dailyMicros: number | null; readonly monthlyMicros: number | null };
}

/** What the committed-spend rule reads of one Generation. */
export interface SpendFact { readonly createdAt: string; readonly estimate: unknown; readonly actual: unknown | null; readonly maybeRuns: number }

const upperBound = (estimate: Estimate): number | null => (estimate.form === "point" ? estimate.amountMicros : estimate.form === "range" ? estimate.maxMicros : null);

/**
 * What one Generation counts toward committed spend (BUSINESS §5.3, §6.3): its approved estimate while unsettled; once settled,
 * its actual cost (reported or computed), its estimate when it was billed but no actual is available, and one estimate per run
 * that may have been billed, until reconciled. A run known not to be billed counts nothing.
 */
function committed(fact: SpendFact): number {
  const upper = upperBound(estimateSchema.parse(fact.estimate)) ?? 0;
  if (fact.actual === null) return upper;
  const actual = actualCostSchema.parse(fact.actual);
  const settled = actual.form === "unknown" ? (actual.billed === "yes" ? upper : 0) : actual.amountMicros;
  return settled + fact.maybeRuns * upper;
}

/** How far back the facts must reach for any Account's current calendar month to be covered, whatever its timezone. */
export const admissionLookback = (now: number): string => new Date(now - 33 * 86_400_000).toISOString();

/** The Account-local calendar day and month (`yyyy-mm-dd`, `yyyy-mm`) of an instant. */
function localPeriod(ms: number, timeZone: string): { readonly day: string; readonly month: string } {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  return { day, month: day.slice(0, 7) };
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
 * cannot jointly exceed a limit. Periods are the Account's local calendar day and month. The ceiling is tested first: raising a creator cap cannot clear it.
 */
export function admit(input: {
  readonly estimate: Estimate; readonly facts: readonly SpendFact[]; readonly now: number; readonly caps: Caps;
  /** The Account's IANA timezone: its calendar day and month are the periods (BUSINESS §6.1). Null only while no limit is configured. */
  readonly timeZone: string | null;
}): Admission {
  const upper = upperBound(input.estimate);
  if (upper === null) return { result: "refused", reason: "price-unknown" };
  const { ceiling, creator } = input.caps;
  const limited = [creator.dailyMicros, creator.monthlyMicros, creator.perActionMicros, ceiling.dailyMicros, ceiling.monthlyMicros].some((limit) => limit !== null);
  if (limited && input.timeZone === null) throw new Error("the Account's time zone is not configured; its caps have no period");
  const zone = input.timeZone ?? "UTC";
  const here = localPeriod(input.now, zone);
  const facts = input.facts.map((f) => ({ f, at: localPeriod(Date.parse(f.createdAt), zone) }));
  const day = facts.filter(({ at }) => at.day === here.day).reduce((sum, { f }) => sum + committed(f), 0);
  const month = facts.filter(({ at }) => at.month === here.month).reduce((sum, { f }) => sum + committed(f), 0);
  if ((ceiling.dailyMicros !== null && day + upper > ceiling.dailyMicros) || (ceiling.monthlyMicros !== null && month + upper > ceiling.monthlyMicros)) return { result: "refused", reason: "studio-limit" };
  if (creator.perActionMicros !== null && upper > creator.perActionMicros) return { result: "refused", reason: "creator-cap", cap: "action", remainingMicros: creator.perActionMicros };
  if (creator.dailyMicros !== null && day + upper > creator.dailyMicros) return { result: "refused", reason: "creator-cap", cap: "daily", remainingMicros: Math.max(0, creator.dailyMicros - day) };
  if (creator.monthlyMicros !== null && month + upper > creator.monthlyMicros) return { result: "refused", reason: "creator-cap", cap: "monthly", remainingMicros: Math.max(0, creator.monthlyMicros - month) };
  return { result: "admitted" };
}
