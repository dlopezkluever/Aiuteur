import { actualCostSchema, estimateSchema, type ActualCost, type Billed, type Estimate, type RenderedRequest } from "@aiuteur/contract";
import { billedQuantities, count, type BilledQuantity, type BilledQuantityRule, type Declared, type PriceEntry } from "@aiuteur/providers";

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
 * The billed quantities of ONE run, derived from that run's own Rendered request and answer (BUSINESS §4.4, "computed"): what
 * the request fixes exactly, and for token-priced text the output the declared counter finds in the response, within the
 * request's bounds. Null when the quantity genuinely cannot be known (no declared rule, or a bound that only the provider knows).
 */
export function derivedQuantities(rule: Declared<BilledQuantityRule>, request: RenderedRequest, response: string | null): Quantity[] | null {
  if (rule.state !== "declared") return null;
  let quantities: BilledQuantity[];
  try { quantities = billedQuantities(rule.value, request); } catch (error) { if (error instanceof RangeError) return null; throw error; }
  const out: Quantity[] = [];
  for (const q of quantities) {
    if (q.bounds.min === q.bounds.max) out.push({ unit: q.unit, amount: q.bounds.max });
    else if (rule.value.rule === "text-tokens" && q.unit === "output-token" && response !== null) out.push({ unit: q.unit, amount: Math.min(q.bounds.max, Math.max(q.bounds.min, count(response, rule.value.counter))) });
    else return null;
  }
  return out;
}

/** One run known to have been billed: what the provider reported for it, and what its own request and answer derive. */
export interface RunQuantities { readonly reported: readonly Quantity[] | null; readonly derived: readonly Quantity[] | null }

/**
 * The Generation's actual cost, set once at settlement (JOB-LIFECYCLE §4; BUSINESS §4.4), over every run billed `yes`: each run
 * is priced by its own reported quantities, else its own derived ones, and the costs add (each run once). The form is
 * `reported` when every run was reported, `computed` otherwise. A run whose quantity cannot be known makes the whole actual
 * `unknown` (billed yes), which the cap check counts at the Generation's estimate. Runs billed `no` or `maybe` are not in `runs`:
 * `no` costs nothing and `maybe` is counted by `SpendFact.maybeRuns`, never twice. With no billed run the actual is `unknown`
 * with what is known about billing.
 */
export function settleActual(runs: readonly RunQuantities[], entries: readonly PriceEntry[], billed: Billed): ActualCost {
  if (runs.length === 0) return { form: "unknown", billed };
  let amountMicros = 0;
  const quantities: Quantity[] = [];
  for (const run of runs) {
    const used = run.reported ?? run.derived;
    if (used === null) return { form: "unknown", billed: "yes" };
    for (const quantity of used) {
      const entry = entries.find((e) => e.unit === quantity.unit);
      if (!entry) return { form: "unknown", billed: "yes" };
      amountMicros += Math.ceil((quantity.amount * entry.priceMicros) / entry.per);
      quantities.push({ unit: quantity.unit, amount: quantity.amount });
    }
  }
  return { form: runs.every((run) => run.reported !== null) ? "reported" : "computed", currency: "USD", amountMicros, quantities };
}
type Quantity = { readonly unit: BilledQuantity["unit"]; readonly amount: number };

/** Creator caps and the hidden operator ceiling, in micro-units per account calendar period. Configuration with no default (BUSINESS §9); null means no limit. */
export interface Caps {
  readonly creator: { readonly dailyMicros: number | null; readonly monthlyMicros: number | null; readonly perActionMicros: number | null };
  /** Applies to operator-paid spend only, which is all spend until BYOK (BUSINESS §6.2). */
  readonly ceiling: { readonly dailyMicros: number | null; readonly monthlyMicros: number | null };
}

/** What the committed-spend rule reads of one Generation. */
export interface SpendFact { readonly createdAt: string; readonly estimate: unknown; readonly actual: unknown | null;
  /** The sum of its runs' counted amounts (`generation_run.counted_micros`); null when any run predates the column. */
  readonly countedMicros: number | null;
}

export const upperBound = (estimate: Estimate): number | null => (estimate.form === "point" ? estimate.amountMicros : estimate.form === "range" ? estimate.maxMicros : null);

/**
 * What one Generation counts toward committed spend (BUSINESS §5.3, §6.3): its approved estimate while unsettled; once settled,
 * the sum of what each of its runs counts (`runCounted`, written with the run), so every run is represented exactly once.
 * Runs written before per-run counts existed fall back to the Generation's actual, or its estimate when that is unavailable.
 */
function committed(fact: SpendFact): number {
  const upper = upperBound(estimateSchema.parse(fact.estimate)) ?? 0;
  if (fact.actual === null) return upper;
  if (fact.countedMicros !== null) return fact.countedMicros;
  const actual = actualCostSchema.parse(fact.actual);
  return actual.form === "unknown" ? (actual.billed === "no" ? 0 : upper) : actual.amountMicros;
}

/**
 * The most one run can bill, from that run's own Rendered request and the declared rule: every quantity at its upper bound,
 * priced by the entries (no staleness widening). Null when the rule is undeclared or a quantity has no price entry.
 */
export function upperBoundMicros(rule: Declared<BilledQuantityRule>, request: RenderedRequest, entries: readonly PriceEntry[]): number | null {
  if (rule.state !== "declared") return null;
  let quantities: BilledQuantity[];
  try { quantities = billedQuantities(rule.value, request); } catch (error) { if (error instanceof RangeError) return null; throw error; }
  let total = 0;
  for (const q of quantities) {
    const entry = entries.find((e) => e.unit === q.unit);
    if (!entry) return null;
    total += Math.ceil((q.bounds.max * entry.priceMicros) / entry.per);
  }
  return total;
}

/**
 * What one run counts toward committed spend, once (BUSINESS §5.3): `no` nothing; `yes` its actual, reported else derived
 * from its own request and answer; `maybe`, or a `yes` whose quantity cannot be known, the run's own upper bound until
 * reconciled. The upper bound is exposure, never recorded as an actual.
 */
export function runCounted(run: { readonly billed: Billed; readonly reported: readonly Quantity[] | null; readonly derived: readonly Quantity[] | null; readonly upperMicros: number }, entries: readonly PriceEntry[]): number {
  if (run.billed === "no") return 0;
  if (run.billed === "yes") {
    const used = run.reported ?? run.derived;
    if (used !== null) {
      let total = 0;
      for (const q of used) {
        const entry = entries.find((e) => e.unit === q.unit);
        if (!entry) return run.upperMicros;
        total += Math.ceil((q.amount * entry.priceMicros) / entry.per);
      }
      return total;
    }
  }
  return run.upperMicros;
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
