import { describe, expect, it } from "vitest";
import { AUTHORISATION_KINDS, OPERATION_CLASSES } from "@aiuteur/contract";
import { billedQuantities, CatalogueInvalid, loadCatalogue, select, snapshotProfile } from "@aiuteur/providers";
import { FAKE_TEXT_PROFILE_CONTENT, SYNTHETIC_CATALOGUE_DATA } from "@aiuteur/testing";

type Data = typeof SYNTHETIC_CATALOGUE_DATA;
const synthetic = { kind: "assumed", reviewer: "test", reason: "F10 case" } as const;
/** The synthetic Catalogue with one edit; the edit is applied to a copy. */
function edited(change: (data: Data & Record<string, unknown>) => void): unknown {
  const data = structuredClone(SYNTHETIC_CATALOGUE_DATA) as Data & Record<string, unknown>;
  change(data);
  return data;
}
const text = (data: Data) => data.offerings[0]!.profile as unknown as Record<string, any>;
const video = (data: Data) => data.offerings[3]!.profile as unknown as Record<string, any>;
function refusal(data: unknown): readonly string[] {
  try {
    loadCatalogue(data);
  } catch (error) {
    if (error instanceof CatalogueInvalid) return error.issues;
    throw error;
  }
  throw new Error("the Catalogue loaded");
}

describe("F10: invalid Catalogue data fails at load (PROVIDERS-AND-MODELS §9)", () => {
  it("the synthetic Catalogue loads, its video and image fakes included", () => {
    expect(loadCatalogue(SYNTHETIC_CATALOGUE_DATA).offerings.map((o) => o.profile.offeringId)).toStrictEqual(["fake-text", "fake-text-undocumented", "fake-text-preview", "fake-video", "fake-image"]);
  });

  it.each<[string, (d: Data & Record<string, unknown>) => void, RegExp]>([
    ["an unknown profile field", (d) => { text(d)["promptTemplate"] = "x"; }, /Unrecognized key/],
    ["evidence missing on an identity-critical field", (d) => { delete text(d)["limits"].prompt.evidence; }, /limits\.prompt/],
    ["an operation class outside the closed vocabulary", (d) => { text(d)["operationClasses"] = ["text.create", "text.summarise"]; }, /operationClasses/],
    ["an authorisation kind outside the closed vocabulary", (d) => { text(d)["audio"].voiceSourceRequirement = { state: "declared", value: "consent-form", evidence: synthetic }; }, /voiceSourceRequirement/],
    ["a missing section", (d) => { delete text(d)["audio"]; }, /audio/],
    ["a price that is not a whole number of micro-units", (d) => { (d.priceEntries[0] as Record<string, unknown>)["priceMicros"] = 1.5; }, /priceEntries\.0\.priceMicros/],
  ])("schema: %s", (_name, change, issue) => {
    expect(refusal(edited(change)).join("\n")).toMatch(issue);
  });

  it.each<[string, (d: Data & Record<string, unknown>) => void, RegExp]>([
    ["a default duration outside its declared set", (d) => { video(d)["duration"].value.default = 5; }, /default duration 5 is outside its declared set/],
    ["a default duration off the declared range's step", (d) => { video(d)["duration"] = { state: "declared", value: { kind: "range", min: 2, max: 10, step: 2, default: 5, auto: false, billed: "requested" }, evidence: synthetic }; }, /outside its declared range/],
    ["an extension without a base duration", (d) => { text(d)["extension"] = { state: "declared", value: { sameModelOnly: true, increment: { set: [7] }, maxTotal: 21, input: { resolutions: [720], aspects: ["16:9"], maxSeconds: null }, output: "combined" }, evidence: synthetic }; }, /extension is declared without a base duration/],
    ["a safety margin that leaves no room", (d) => { text(d)["limits"].prompt.value.margin = 8192; }, /safety margin/],
    ["a token rule counting differently from the prompt limit", (d) => { text(d)["cost"].billedQuantity.value.counter = "unicode-code-points"; }, /different counter/],
    ["a token rule with no declared maximum output", (d) => { text(d)["limits"].output = { state: "unknown" }; }, /declared maximum output/],
    ["a token rule output minimum above the maximum", (d) => { text(d)["cost"].billedQuantity.value.outputMin = 4096; }, /output minimum is above/],
    ["a duration billing rule with no duration", (d) => { video(d)["duration"] = { state: "unknown" }; }, /duration billing rule needs a declared duration/],
    ["an operation class of another family", (d) => { text(d)["operationClasses"] = ["text.create", "image.frame"]; }, /image\.frame is not of family text/],
    ["a cloning Offering without delete voice", (d) => { text(d)["audio"].voiceSources = { state: "declared", value: ["cloned"], evidence: synthetic }; text(d)["audio"].voiceSourceRequirement = { state: "declared", value: "attestation", evidence: synthetic }; }, /must declare delete voice/],
    ["a cloning Offering whose authorisation precondition is unknown", (d) => { text(d)["audio"].voiceSources = { state: "declared", value: ["cloned"], evidence: synthetic }; text(d)["audio"].deleteVoice = { state: "declared", value: true, evidence: synthetic }; text(d)["audio"].voiceSourceRequirement = { state: "declared", value: "unknown", evidence: synthetic }; }, /known authorisation precondition/],
    ["an unknown dialect", (d) => { text(d)["dialect"] = { id: "neutral-text", version: 9 }; }, /dialect neutral-text@9 is not known/],
    ["an Offering listed twice", (d) => { d.offerings.push(structuredClone(d.offerings[0]!)); }, /offering fake-text is listed twice/],
    ["a ranking naming a Model with no Offering of the class", (d) => { (d.ranking as Record<string, string[]>)["text.create"]!.push("fake-image-model"); }, /names fake-image-model/],
    ["a price entry for an unknown Offering", (d) => { d.priceEntries.push({ ...d.priceEntries[0]!, offeringId: "nowhere" }); }, /unknown offering nowhere/],
    ["a price entry for a unit its rule never bills", (d) => { d.priceEntries.push({ ...d.priceEntries[0]!, unit: "second" }); }, /prices second, which its rule never bills/],
    ["a price entry listed twice", (d) => { d.priceEntries.push({ ...d.priceEntries[0]! }); }, /listed twice/],
  ])("cross-field: %s", (_name, change, issue) => {
    expect(refusal(edited(change)).join("\n")).toMatch(issue);
  });
});

describe("EI3 and FC10: the profile shape is broader than what T0 executes", () => {
  it("the operation classes include the reserved audio classes and world.generate, and no synthetic Offering performs them", () => {
    expect(OPERATION_CLASSES).toEqual(expect.arrayContaining(["audio.speech", "audio.transform", "audio.lipsync", "audio.voice", "audio.transcribe", "world.generate"]));
    expect(AUTHORISATION_KINDS).toStrictEqual(["attestation", "speaker-verification", "own-voice-only", "allowlist", "unknown"]);
    const performed = loadCatalogue(SYNTHETIC_CATALOGUE_DATA).offerings.flatMap((o) => o.profile.operationClasses);
    expect(performed.filter((c) => c.startsWith("audio.") || c === "world.generate")).toStrictEqual([]);
  });

  it("an audio profile with every audio field declared validates: the fields exist even though no audio Offering does", () => {
    const evidence = synthetic;
    const audio = edited((d) => {
      Object.assign(text(d), { offeringId: "audio-shape", modelId: "audio-shape-model", family: "audio", operationClasses: ["audio.speech", "audio.voice"], cost: { billedQuantity: { state: "unknown" }, actualCostReported: { state: "unknown" } } });
      text(d)["audio"] = {
        native: { state: "declared-none", evidence }, dialogueFromText: { state: "declared", value: true, evidence }, lipSyncDocumented: { state: "declared", value: false, evidence },
        languages: { state: "declared", value: ["en"], evidence }, drivingAudio: { state: "declared-none", evidence },
        voiceReferences: { state: "declared", value: { maxCount: 3, perClipSeconds: 30, totalSeconds: 90 }, evidence },
        voiceSources: { state: "declared", value: ["stock", "cloned"], evidence }, voiceSourceRequirement: { state: "declared", value: "speaker-verification", evidence },
        voiceDesign: { state: "declared", value: true, evidence }, deleteVoice: { state: "declared", value: true, evidence },
        lipSyncSubjects: { state: "declared", value: ["human"], evidence }, timingOutput: { state: "declared", value: "word", evidence },
      };
      d.priceEntries.splice(0, 2);
      (d.ranking as Record<string, string[]>)["text.create"] = ["fake-text-preview-model", "fake-text-undocumented-model"];
    });
    expect(loadCatalogue(audio).offerings[0]?.profile.family).toBe("audio");
  });

  it("snapshots are content-addressed: same content, same id; a compile-relevant change, a new id; the status overlay does not change it", () => {
    expect(snapshotProfile(structuredClone(FAKE_TEXT_PROFILE_CONTENT)).snapshotId).toBe(snapshotProfile(FAKE_TEXT_PROFILE_CONTENT).snapshotId);
    const larger = { ...FAKE_TEXT_PROFILE_CONTENT, limits: { ...FAKE_TEXT_PROFILE_CONTENT.limits, output: { state: "declared", value: { unit: "tokens", max: 4096 }, evidence: synthetic } } } as const;
    expect(snapshotProfile(larger).snapshotId).not.toBe(snapshotProfile(FAKE_TEXT_PROFILE_CONTENT).snapshotId);
    const suspended = loadCatalogue(edited((d) => { d.offerings[0]!.status = "suspended"; }));
    expect(suspended.offerings[0]?.profile.snapshotId).toBe(loadCatalogue(SYNTHETIC_CATALOGUE_DATA).offerings[0]?.profile.snapshotId);
    expect(Object.isFrozen(suspended.offerings[0]?.profile)).toBe(true);
  });
});

describe("selection (PROVIDERS §8.3): before compile, visible, deterministic", () => {
  it("Automatic skips a preview Offering and one with an unknown identity-critical field, and says why", () => {
    const catalogue = loadCatalogue(SYNTHETIC_CATALOGUE_DATA);
    const selection = select(catalogue, "text.create");
    expect(selection).toMatchObject({ result: "selected", effective: { operationClass: "text.create", modelId: "fake-text-model", offeringId: "fake-text", source: "automatic" } });
    if (selection.result !== "selected") return;
    expect(selection.effective.profileSnapshotId).toBe(selection.profile.snapshotId);
    expect(selection.effective.reasons).toStrictEqual([
      { code: "default-by-policy" },
      { code: "skipped", modelId: "fake-text-undocumented-model", reason: "unknown-identity-critical" },
      { code: "skipped", modelId: "fake-text-preview-model", reason: "status" },
    ]);
    expect(select(loadCatalogue(SYNTHETIC_CATALOGUE_DATA), "text.create")).toStrictEqual(selection);
  });

  it("no eligible Offering is unavailable with the reasons, never a substitute from another class", () => {
    expect(select(loadCatalogue(SYNTHETIC_CATALOGUE_DATA), "audio.speech")).toStrictEqual({ result: "unavailable", operationClass: "audio.speech", reasons: [] });
    const allSuspended = loadCatalogue(edited((d) => { d.offerings[0]!.status = "suspended"; }));
    expect(select(allSuspended, "text.create")).toMatchObject({ result: "unavailable", reasons: expect.arrayContaining([{ code: "skipped", modelId: "fake-text-model", reason: "status" }]) });
  });
});

describe("billed quantity of token-priced text (BUSINESS §4.2; #101 decision 5)", () => {
  const rule = { rule: "text-tokens", counter: "utf8-bytes", outputMaxParameter: "maxOutputTokens", outputMin: 0 } as const;
  const request = (parameters: Record<string, number>) => ({ textParts: [{ layerKey: "a", text: "héllo", layerDigest: "d" }, { layerKey: "b", text: "🎬", layerDigest: "d" }], mediaParts: [], parameters, rewrites: [] });
  it("input is counted from the Rendered request; output runs from the declared minimum to the request's maximum", () => {
    expect(billedQuantities(rule, request({ maxOutputTokens: 2048 }))).toStrictEqual([
      { unit: "input-token", amount: 10, bounds: { min: 10, max: 10 } },
      { unit: "output-token", amount: 2048, bounds: { min: 0, max: 2048 } },
    ]);
    expect(billedQuantities({ ...rule, counter: "unicode-code-points" }, request({ maxOutputTokens: 5 }))[0]?.amount).toBe(6);
    expect(() => billedQuantities(rule, request({}))).toThrow(RangeError);
  });
});
