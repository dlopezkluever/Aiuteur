import { describe, expect, it } from "vitest";
import { priceEntries } from "@aiuteur/providers";
import { actual, admit, type Caps, type SpendFact } from "@aiuteur/spend";
import { syntheticCatalogue } from "@aiuteur/testing";

// spend.admit over explicit values (BUSINESS §6.3). No production default exists; every figure here is a test value.
const point = (amountMicros: number) => ({ form: "point" as const, currency: "USD" as const, amountMicros, basis: { requestDigest: "sha256:x", quantities: [], entries: [] } });
const caps = (creator: Partial<Caps["creator"]>): Caps => ({ creator: { dailyMicros: null, monthlyMicros: null, perActionMicros: null, ...creator }, ceiling: { dailyMicros: null, monthlyMicros: null } });
const computed = (createdAt: string, amountMicros: number, maybeRuns = 0): SpendFact => ({ createdAt, estimate: point(100), actual: { form: "computed", currency: "USD", amountMicros, quantities: [] }, maybeRuns });
const at = (iso: string) => Date.parse(iso);

describe("actual cost: reported, computed, unknown (BUSINESS §4.4)", () => {
  const entries = priceEntries(syntheticCatalogue(), "fake-text", "text.create");
  const nominal = [{ unit: "input-token" as const, amount: 1000 }, { unit: "output-token" as const, amount: 1000 }];
  it("computes from the billed quantity and the price entry when nothing was reported and the run was billed", () => {
    expect(actual(null, entries, "yes", nominal)).toMatchObject({ form: "computed", currency: "USD", amountMicros: 3_000 + 15_000 });
    expect(actual(nominal, entries, "yes", [])).toMatchObject({ form: "reported", amountMicros: 18_000 });
  });
  it("stays unknown when the run may not have been billed, or nothing can be computed", () => {
    expect(actual(null, entries, "maybe", nominal)).toEqual({ form: "unknown", billed: "maybe" });
    expect(actual(null, entries, "yes", null)).toEqual({ form: "unknown", billed: "yes" });
  });
});

describe("committed spend", () => {
  it("a settled COMPUTED actual counts toward the next admission, exactly as a reported one does", () => {
    const facts = [computed("2026-06-10T12:00:00Z", 900)];
    const now = at("2026-06-10T13:00:00Z");
    expect(admit({ estimate: point(100), facts, now, caps: caps({ dailyMicros: 1_000 }), timeZone: "UTC" })).toEqual({ result: "admitted" });
    expect(admit({ estimate: point(100), facts, now, caps: caps({ dailyMicros: 999 }), timeZone: "UTC" })).toEqual({ result: "refused", reason: "creator-cap", cap: "daily", remainingMicros: 99 });
  });
  it("a maybe-billed run adds its estimate until reconciled; a settled run known unbilled adds nothing", () => {
    const now = at("2026-06-10T13:00:00Z");
    const maybe = [computed("2026-06-10T12:00:00Z", 900, 1)];
    expect(admit({ estimate: point(100), facts: maybe, now, caps: caps({ dailyMicros: 1_099 }), timeZone: "UTC" })).toMatchObject({ result: "refused" });
    const unbilled: SpendFact[] = [{ createdAt: "2026-06-10T12:00:00Z", estimate: point(500), actual: { form: "unknown", billed: "no" }, maybeRuns: 0 }];
    expect(admit({ estimate: point(100), facts: unbilled, now, caps: caps({ dailyMicros: 100 }), timeZone: "UTC" })).toEqual({ result: "admitted" });
  });
});

describe("periods are the Account's local calendar day and month (BUSINESS §6.1, §9)", () => {
  it("America/Los_Angeles: UTC has crossed midnight and the month, the Account has not, so earlier spend still counts", () => {
    // 2026-11-01T03:00Z is Oct 31, 20:00 in Los Angeles; the fact (Oct 31, 13:00 there) is the same local day and month.
    const facts = [computed("2026-10-31T20:00:00Z", 900)];
    const now = at("2026-11-01T03:00:00Z");
    expect(admit({ estimate: point(100), facts, now, caps: caps({ dailyMicros: 999 }), timeZone: "America/Los_Angeles" })).toMatchObject({ result: "refused", cap: "daily" });
    expect(admit({ estimate: point(100), facts, now, caps: caps({ monthlyMicros: 999 }), timeZone: "America/Los_Angeles" })).toMatchObject({ result: "refused", cap: "monthly" });
    // The same instants for an Account configured as UTC: a new UTC day and month, so nothing counts.
    expect(admit({ estimate: point(100), facts, now, caps: caps({ dailyMicros: 999, monthlyMicros: 999 }), timeZone: "UTC" })).toEqual({ result: "admitted" });
  });
  it("Pacific/Kiritimati: the same UTC day is already the Account's next day, so the daily total starts again", () => {
    // Fact: Nov 1, 15:00 on Kiritimati (UTC+14). Now: Nov 2, 01:00 there. Same UTC day, different Account day, same month.
    const facts = [computed("2026-11-01T01:00:00Z", 900)];
    const now = at("2026-11-01T11:00:00Z");
    expect(admit({ estimate: point(100), facts, now, caps: caps({ dailyMicros: 999 }), timeZone: "Pacific/Kiritimati" })).toEqual({ result: "admitted" });
    expect(admit({ estimate: point(100), facts, now, caps: caps({ dailyMicros: 999 }), timeZone: "UTC" })).toMatchObject({ result: "refused" });
    expect(admit({ estimate: point(100), facts, now, caps: caps({ monthlyMicros: 999 }), timeZone: "Pacific/Kiritimati" })).toMatchObject({ result: "refused", cap: "monthly" });
  });
  it("an Account with a limit but no timezone cannot be admitted; with no limit it needs none", () => {
    expect(() => admit({ estimate: point(100), facts: [], now: 0, caps: caps({ dailyMicros: 1 }), timeZone: null })).toThrow(/time zone/);
    expect(admit({ estimate: point(100), facts: [], now: 0, caps: caps({}), timeZone: null })).toEqual({ result: "admitted" });
  });
});
