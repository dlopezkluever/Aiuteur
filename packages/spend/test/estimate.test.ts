import { describe, expect, it } from "vitest";
import { priceEntries, type PriceEntry } from "@aiuteur/providers";
import { estimate } from "@aiuteur/spend";
import { FAKE_IMAGE_PROFILE, FAKE_TEXT_PROFILE, syntheticCatalogue } from "@aiuteur/testing";

const catalogue = syntheticCatalogue();
const policy = { widenAfterDays: 30, unknownAfterDays: 90, driftPermille: 100 };
const today = "2026-10-28";
const textEntries = priceEntries(catalogue, "fake-text", "text.create");
const textRequest = { textParts: [{ layerKey: "source-material", text: "a".repeat(1000), layerDigest: "d" }], mediaParts: [], parameters: { maxOutputTokens: 2048 }, rewrites: [] };
const text = (over: Partial<Parameters<typeof estimate>[0]> = {}) => estimate({ request: textRequest, digest: "sha256:req", rule: FAKE_TEXT_PROFILE.cost.billedQuantity, entries: textEntries, today, policy, ...over });

describe("spend.estimate: the three forms (BUSINESS-AND-OPERATIONS §4.2)", () => {
  it("Point when the request determines the cost: two images at a synthetic 0.04 each", () => {
    const result = estimate({ request: { textParts: [], mediaParts: [], parameters: { count: 2 }, rewrites: [] }, digest: "sha256:img", rule: FAKE_IMAGE_PROFILE.cost.billedQuantity, entries: priceEntries(catalogue, "fake-image", "image.frame"), today, policy });
    expect(result).toMatchObject({ form: "point", currency: "USD", amountMicros: 80_000, basis: { requestDigest: "sha256:img", quantities: [{ unit: "image", amount: 2 }] } });
  });

  it("Range for token-priced text: input priced exactly, output from 0 to the request's maximum, each by its own entry", () => {
    // 1,000 input tokens at 3,000,000 micros per million = 3,000; output 0..2,048 at 15,000,000 per million = 0..30,720.
    expect(text()).toStrictEqual({
      form: "range", currency: "USD", minMicros: 3_000, maxMicros: 33_720,
      basis: {
        requestDigest: "sha256:req",
        quantities: [{ unit: "input-token", amount: 1000, bounds: { min: 1000, max: 1000 } }, { unit: "output-token", amount: 2048, bounds: { min: 0, max: 2048 } }],
        entries: textEntries.map((e) => ({ unit: e.unit, per: e.per, priceMicros: e.priceMicros, confirmedOn: e.confirmedOn, source: e.source, stale: false })),
      },
    });
  });

  it("Unknown with its reason: no entry for a billed unit, no rule, an undetermined quantity, a price stale beyond its limit", () => {
    expect(text({ entries: textEntries.filter((e) => e.unit === "input-token") })).toMatchObject({ form: "unknown", reason: "no-price-entry" });
    expect(text({ rule: { state: "unknown" } })).toMatchObject({ form: "unknown", reason: "no-billed-quantity-rule" });
    expect(text({ request: { ...textRequest, parameters: {} } })).toMatchObject({ form: "unknown", reason: "quantity-undetermined" });
    expect(text({ today: "2027-01-19" })).toMatchObject({ form: "unknown", reason: "stale-price-entry" });
  });

  it("a price past its review age widens the estimate by the drift allowance; the boundary day does not", () => {
    expect(text({ today: "2026-11-19" }).form).toBe("range");
    expect(text({ today: "2026-11-19" })).toMatchObject({ minMicros: 3_000, maxMicros: 33_720 });
    expect(text({ today: "2026-11-20" })).toMatchObject({ form: "range", minMicros: 2_700, maxMicros: 37_092 });
    const image = (day: string, entries: readonly PriceEntry[] = priceEntries(catalogue, "fake-image", "image.frame")) =>
      estimate({ request: { textParts: [], mediaParts: [], parameters: { count: 1 }, rewrites: [] }, digest: "d", rule: FAKE_IMAGE_PROFILE.cost.billedQuantity, entries, today: day, policy });
    expect(image("2026-11-20")).toMatchObject({ form: "range", minMicros: 36_000, maxMicros: 44_000, basis: { entries: [{ stale: true }] } });
  });
});
