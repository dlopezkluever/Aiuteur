import { readdirSync, readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { TEXT_LAYER_KEYS } from "@aiuteur/contract";
import { compile, compose, fit, layerText, TEXT_LAYER_CATALOG, type Layer, type Package } from "@aiuteur/compiler";
import { canonicalJson, count, NEUTRAL_TEXT_DIALECT, sha256, snapshotProfile, unwrap, type ProfileContent } from "@aiuteur/providers";
import { FAKE_TEXT_PROFILE, FAKE_TEXT_PROFILE_CONTENT } from "@aiuteur/testing";
import { GP_S_TREATMENT_INPUTS, goldenOf, judge, readGolden, versionKey } from "./golden.ts";

describe("VC2: golden Rendered request from the first GP-S-shaped ResolvedInputs", () => {
  it("the compile equals the reviewed golden in full: text and parts, Package, Fit, digest and versions", () => {
    const golden = readGolden();
    const actual = goldenOf(compile(GP_S_TREATMENT_INPUTS, FAKE_TEXT_PROFILE), golden.history);
    expect(judge(golden, actual)).toBe("match");
    expect(actual.renderedRequest).toStrictEqual(golden.renderedRequest);
    expect(actual.digest).toBe(sha256(canonicalJson(golden.renderedRequest)));
    expect(golden.history.at(-1)).toStrictEqual({ versions: versionKey(golden.versions), digest: golden.digest });
  });

  it("a changed byte in the Rendered request under unchanged versions fails; a bumped version only marks the golden stale", () => {
    const golden = readGolden();
    const compiled = compile(GP_S_TREATMENT_INPUTS, FAKE_TEXT_PROFILE);
    if (compiled.result !== "fitted") throw new Error("expected a fit");
    // What a one-byte scaffold edit produces: same versions, one byte different in one text part.
    const [first, ...rest] = compiled.renderedRequest.textParts;
    if (!first) throw new Error("no text part");
    const edited = { ...compiled.renderedRequest, textParts: [{ ...first, text: first.text.replace("Draft one", "Draft  one") }, ...rest] };
    const changed = { ...compiled, renderedRequest: edited, digest: sha256(canonicalJson(edited)) };
    expect(judge(golden, goldenOf(changed, golden.history))).toBe("unbumped-change");
    const bumped = { ...changed, versions: { ...changed.versions, scaffold: { ...changed.versions.scaffold, version: 2 } } };
    expect(judge(golden, goldenOf(bumped, golden.history))).toBe("stale");
    // Reusing a version already recorded with another digest is refused too.
    expect(judge({ ...golden, history: [...golden.history, { versions: versionKey(golden.versions), digest: "sha256:other" }] }, goldenOf(compiled, golden.history))).toBe("history-conflict");
  });
});

describe("R4 and GENERATION-PACKAGE §13.2: compile is pure and deterministic", () => {
  it("the same ResolvedInputs and snapshot give byte-identical output, from copies and repeated calls", () => {
    const runs = Array.from({ length: 3 }, () => compile(structuredClone(GP_S_TREATMENT_INPUTS), snapshotProfile(structuredClone(FAKE_TEXT_PROFILE_CONTENT))));
    for (const run of runs) expect(canonicalJson(run)).toBe(canonicalJson(runs[0]));
  });

  it("compiler sources import only contract and the providers catalogue face, and read no clock, randomness or environment", () => {
    const dir = new URL("../src/", import.meta.url);
    for (const file of readdirSync(dir)) {
      const text = readFileSync(new URL(file, dir), "utf8");
      const specifiers = [...text.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
      expect(specifiers.filter((s) => !["@aiuteur/contract", "@aiuteur/providers"].includes(s ?? "") && !s?.startsWith("./")), file).toStrictEqual([]);
      expect(text, file).not.toMatch(/\bDate\b|Math\.random|process\.|performance\.|crypto\.|fetch\(|import\(/);
    }
  });

  it("the text Package: scaffold, then source-material; base, instruction, binding and writing-style are absent", () => {
    const pkg = compose(GP_S_TREATMENT_INPUTS);
    expect(pkg.layers.map((l) => [l.key, l.tier])).toStrictEqual([["scaffold:operation", 0], ["source-material", 0]]);
    expect(TEXT_LAYER_KEYS.indexOf("source-material")).toBeGreaterThan(TEXT_LAYER_KEYS.indexOf("writing-style"));
    expect(TEXT_LAYER_CATALOG["writing-style"].tier).toBe(1);
    expect(pkg.layers[1]?.parts).toStrictEqual([{ provenance: "verbatim", text: GP_S_TREATMENT_INPUTS.sourceMaterial.text, source: "019a2b3c-4d5e-7f60-8a1b-2c3d4e5f6a7b@1" }]);
    expect(pkg.layers[1]?.sources).toStrictEqual([GP_S_TREATMENT_INPUTS.sourceMaterial.captured]);
  });
});

// Profiles in the tested domain: every counter, a range of limits and margins, and the three states of the limit.
const profileArb = fc.record({
  counter: fc.constantFrom("utf8-bytes" as const, "unicode-code-points" as const),
  max: fc.integer({ min: 1, max: 4000 }),
  marginShare: fc.double({ min: 0, max: 0.99, noNaN: true }),
  state: fc.constantFrom("declared", "declared", "declared", "declared-none", "unknown"),
}).map(({ counter, max, marginShare, state }) => {
  const synthetic = { kind: "assumed", reviewer: "test", reason: "property domain" } as const;
  const margin = Math.min(max - 1, Math.floor(max * marginShare));
  const prompt = state === "declared" ? { state, value: { unit: "tokens", counter, max, margin }, evidence: synthetic } as const
    : state === "declared-none" ? { state, evidence: synthetic } as const : { state: "unknown" } as const;
  const content: ProfileContent = { ...FAKE_TEXT_PROFILE_CONTENT, limits: { ...FAKE_TEXT_PROFILE_CONTENT.limits, prompt }, cost: { ...FAKE_TEXT_PROFILE_CONTENT.cost, billedQuantity: { state: "declared", value: { rule: "text-tokens", counter, outputMaxParameter: "maxOutputTokens", outputMin: 0 }, evidence: synthetic } } };
  return snapshotProfile(content);
});
const textArb = fc.string({ unit: "grapheme", minLength: 1, maxLength: 1500 });
// Packages over every text layer key, each present or absent, with random text sizes: exercises Tier 1 omission too.
const packageArb = fc.record(Object.fromEntries(TEXT_LAYER_KEYS.map((key) => [key, fc.option(fc.array(textArb, { minLength: 1, maxLength: 3 }), { nil: undefined })])))
  .map((texts): Package => ({
    operation: "treatment.draft",
    references: [],
    parameters: {},
    layers: TEXT_LAYER_KEYS.flatMap((key): Layer[] => {
      const parts = texts[key];
      return parts ? [{ key, ...TEXT_LAYER_CATALOG[key], parts: parts.map((text) => ({ provenance: "composed", text, source: null })), sources: [] }] : [];
    }),
  }));

describe("VC3: Fit totality and P4 no truncation (GENERATION-PACKAGE §7, §15 P4, §17.3)", () => {
  it("every Package and profile in the domain gets a defined result: fitted within the limit, or blocked with exits; no throw", () => {
    fc.assert(fc.property(packageArb, profileArb, (pkg, profile) => {
      const fitted = fit(pkg, profile);
      const { report } = fitted;
      // Every layer has exactly one outcome; omission is whole-layer, Tier 1 or 2 only, with a reason.
      expect(report.layers.map((l) => l.key)).toStrictEqual(pkg.layers.map((l) => l.key));
      for (const l of report.layers) {
        if (l.outcome === "omitted-optional") expect([l.tier > 0, l.reason]).toStrictEqual([true, "over-limit"]);
        else expect(l.outcome).toBe(report.blocked ? "blocked" : "carried");
      }
      expect(fitted.carried.map((l) => l.key)).toStrictEqual(report.layers.filter((l) => l.outcome !== "omitted-optional").map((l) => l.key));
      const limit = profile.limits.prompt;
      if (limit.state === "unknown") expect(report.blocked?.reason).toBe("limit-unknown");
      if (limit.state === "declared-none") expect(report.blocked).toBeNull();
      if (limit.state === "declared") {
        const room = limit.value.max - limit.value.margin;
        const measured = fitted.carried.reduce((n, l) => n + count(`[[${l.key}]]\n${layerText(l)}\n[[/${l.key}]]\n`, limit.value.counter), 0);
        if (report.blocked) {
          // Blocked only when Tier 0 alone is over: every optional layer was already omitted.
          expect(fitted.carried.every((l) => l.tier === 0)).toBe(true);
          expect(report.blocked).toMatchObject({ reason: "over-limit", needed: measured, limit: room });
          expect(measured).toBeGreaterThan(room);
          expect(report.blocked.exits.map((e) => e.exit)).not.toContain("send-anyway");
        } else expect(measured).toBeLessThanOrEqual(room);
      }
      // No silent discard: a Tier 0 layer is never omitted.
      expect(report.layers.filter((l) => l.tier === 0 && l.outcome === "omitted-optional")).toStrictEqual([]);
    }), { numRuns: 400 });
  });

  it("P4: stripping the declared wrapper of each text part recovers every carried layer whole, in order, with its digest", () => {
    fc.assert(fc.property(textArb, profileArb, (text, profile) => {
      const inputs = { ...GP_S_TREATMENT_INPUTS, sourceMaterial: { ...GP_S_TREATMENT_INPUTS.sourceMaterial, text } };
      const result = compile(inputs, profile);
      const carried = result.fit.layers.filter((l) => l.outcome === "carried").map((l) => l.key);
      if (result.result === "blocked") {
        expect(result.fit.blocked).not.toBeNull();
        return;
      }
      expect(result.renderedRequest.textParts.map((p) => p.layerKey)).toStrictEqual(carried);
      for (const part of result.renderedRequest.textParts) {
        const original = layerText(result.package.layers.find((l) => l.key === part.layerKey)!);
        expect(unwrap(NEUTRAL_TEXT_DIALECT, part.layerKey, part.text)).toBe(original);
        expect(part.layerDigest).toBe(sha256(original));
      }
      expect(result.renderedRequest.textParts.find((p) => p.layerKey === "source-material")?.text).toContain(text);
    }), { numRuns: 300 });
  });

  it("a Tier 0 layer one unit over the room blocks with the exits; one unit under, it is carried whole", () => {
    const measure = (text: string) => count(`[[scaffold:operation]]\n${layerText(compose(GP_S_TREATMENT_INPUTS).layers[0]!)}\n[[/scaffold:operation]]\n`, "utf8-bytes") + count(`[[source-material]]\n${text}\n[[/source-material]]\n`, "utf8-bytes");
    const text = "x".repeat(900);
    const needed = measure(text);
    const at = (max: number) => snapshotProfile({ ...FAKE_TEXT_PROFILE_CONTENT, limits: { ...FAKE_TEXT_PROFILE_CONTENT.limits, prompt: { state: "declared", value: { unit: "tokens", counter: "utf8-bytes", max, margin: 10 }, evidence: { kind: "assumed", reviewer: "test", reason: "boundary" } } } });
    const inputs = { ...GP_S_TREATMENT_INPUTS, sourceMaterial: { ...GP_S_TREATMENT_INPUTS.sourceMaterial, text } };
    const over = compile(inputs, at(needed + 9));
    expect(over).toMatchObject({ result: "blocked", fit: { blocked: { reason: "over-limit", needed, limit: needed - 1, unit: "tokens", exits: [{ exit: "another-model", layerKey: null }, { exit: "edit-layer", layerKey: "scaffold:operation" }, { exit: "edit-layer", layerKey: "source-material" }] } } });
    expect("renderedRequest" in over).toBe(false);
    const fits = compile(inputs, at(needed + 10));
    expect(fits.result).toBe("fitted");
    expect(fits.fit.promptLimit).toMatchObject({ counted: needed, limit: needed });
  });

  it("an over-limit Tier 1 layer is omitted whole and reported, and the Tier 0 layers stay whole", () => {
    const style = "Spare, wry, present tense. ".repeat(40);
    const pkg: Package = { ...compose(GP_S_TREATMENT_INPUTS), layers: [...compose(GP_S_TREATMENT_INPUTS).layers] };
    const withStyle: Package = { ...pkg, layers: [pkg.layers[0]!, { key: "writing-style", ...TEXT_LAYER_CATALOG["writing-style"], parts: [{ provenance: "authored", text: style, source: null }], sources: [] }, pkg.layers[1]!] };
    const profile = snapshotProfile({ ...FAKE_TEXT_PROFILE_CONTENT, limits: { ...FAKE_TEXT_PROFILE_CONTENT.limits, prompt: { state: "declared", value: { unit: "tokens", counter: "utf8-bytes", max: 800, margin: 0 }, evidence: { kind: "assumed", reviewer: "test", reason: "omission" } } } });
    const fitted = fit(withStyle, profile);
    expect(fitted.report.layers).toStrictEqual([
      { key: "scaffold:operation", tier: 0, outcome: "carried", reason: null },
      { key: "writing-style", tier: 1, outcome: "omitted-optional", reason: "over-limit" },
      { key: "source-material", tier: 0, outcome: "carried", reason: null },
    ]);
    expect(fitted.carried.map(layerText)).toStrictEqual([layerText(pkg.layers[0]!), layerText(pkg.layers[1]!)]);
  });
});

describe("P5 and P10: parameters and provider rewrites are sent or reported (GENERATION-PACKAGE §10.3, §15)", () => {
  const evidence = { kind: "assumed", reviewer: "test", reason: "P10 case" } as const;
  const withControls = (rewrites: ProfileContent["controls"]["rewrites"], output: ProfileContent["limits"]["output"] = FAKE_TEXT_PROFILE_CONTENT.limits.output) =>
    snapshotProfile({ ...FAKE_TEXT_PROFILE_CONTENT, controls: { ...FAKE_TEXT_PROFILE_CONTENT.controls, rewrites }, limits: { ...FAKE_TEXT_PROFILE_CONTENT.limits, output } });
  const sent = (profile: ReturnType<typeof withControls>) => {
    const result = compile(GP_S_TREATMENT_INPUTS, profile);
    if (result.result !== "fitted") throw new Error("expected a fit");
    return { rewrites: result.renderedRequest.rewrites, parameters: result.renderedRequest.parameters, report: result.fit.parameters };
  };
  it("a controllable rewrite is turned off in the request; an always rewrite is recorded; an undeclared one is assumed and recorded", () => {
    expect(sent(withControls({ state: "declared", value: [{ name: "prompt-extend", mode: "controllable", disableParameter: "promptExtend" }, { name: "safety-rephrase", mode: "always", disableParameter: null }], evidence })))
      .toMatchObject({ rewrites: ["safety-rephrase"], parameters: { promptExtend: false, maxOutputTokens: 2048 } });
    expect(sent(withControls({ state: "unknown" })).rewrites).toStrictEqual(["undeclared-provider-rewrite"]);
    expect(sent(withControls({ state: "declared-none", evidence })).rewrites).toStrictEqual([]);
  });
  it("an undeclared maximum output is reported param-unsupported and not sent", () => {
    const result = sent(withControls({ state: "declared-none", evidence }, { state: "unknown" }));
    expect(result.parameters).toStrictEqual({});
    expect(result.report).toStrictEqual([{ name: "maxOutputTokens", outcome: "param-unsupported", requested: "model-maximum", sent: null, reason: "undeclared" }]);
  });
});
