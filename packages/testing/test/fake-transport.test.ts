import { describe, expect, it } from "vitest";
import {
  snapshotProfile,
  type FakeAdapter,
  type ProfileContent,
  type ProfileSnapshot,
  type RealAdapter,
  type RenderedRequest,
  type RunBehaviour,
} from "@aiuteur/providers";
import {
  FAKE_IMAGE_PROFILE,
  FAKE_VIDEO_PROFILE,
  FakeTransport,
  ManualClock,
  ScriptCitationError,
  testCredential,
  testJobId,
  type ProviderScript,
  type ScriptedBehaviour,
} from "@aiuteur/testing";
import { decodeAudio, decodeFirstFrame, formatTags, pngTextChunks, powerAt, readBlockText } from "./media.ts";

function fake(profile: ProfileSnapshot, scripts: readonly ProviderScript[] = []) {
  const clock = new ManualClock();
  return { clock, transport: new FakeTransport({ profile, clock, webhookSecret: "secret", scripts }) };
}

function variant(profile: ProfileSnapshot, change: Partial<Omit<ProfileContent, "runBehaviour">> & { runBehaviour?: Partial<RunBehaviour> }) {
  const { snapshotId: _, ...content } = profile;
  return snapshotProfile({ ...content, ...change, runBehaviour: { ...content.runBehaviour, ...change.runBehaviour } });
}

function request(parameters: RenderedRequest["parameters"]): RenderedRequest {
  return { textParts: [], mediaParts: [], parameters, rewrites: [] };
}

async function finishedOutput(profile: ProfileSnapshot, parameters: RenderedRequest["parameters"]) {
  const { clock, transport } = fake(profile);
  const credential = testCredential();
  const r = request(parameters);
  const submitted = await transport.submit({ request: { digest: "sha256:x", request: r }, credential, idempotencyKey: testJobId("out") });
  if (submitted.outcome !== "accepted") throw new Error(submitted.outcome);
  clock.advance(60 * 60_000);
  const observed = await transport.observe({ via: "poll", credential, operation: submitted.operation });
  if (observed.outcome !== "observed" || observed.status.status !== "succeeded") throw new Error("expected success");
  const fetched = await transport.fetch({ credential, output: observed.status.outputs[0]! });
  if (fetched.outcome !== "fetched") throw new Error(fetched.outcome);
  return { contentType: fetched.contentType, bytes: new Uint8Array(await new Response(fetched.body).arrayBuffer()) };
}

describe("scripted behaviours cite a declared run behaviour of the profile snapshot", () => {
  const scripted = (behaviours: readonly ScriptedBehaviour[]): ProviderScript[] => [{ jobId: testJobId("s"), behaviours }];

  it("accepts a behaviour that cites the declaration it exercises", () => {
    expect(() =>
      fake(FAKE_VIDEO_PROFILE, scripted([
        { behaviour: "duplicate-callbacks", copies: 2, cites: "completionSignal" },
        { behaviour: "complete-despite-cancel", cites: "cancellation" },
        { behaviour: "lose-submit-response", cites: "idempotentSubmission" },
        { behaviour: "fail-while-running", providerCode: "internal_error", message: "m", cites: "errorMapping" },
        { behaviour: "run-for", ms: 30 * 60_000, cites: "completionSignal" },
      ])),
    ).not.toThrow();
  });

  it("refuses a behaviour that cites the wrong declaration", () => {
    expect(() => fake(FAKE_VIDEO_PROFILE, scripted([{ behaviour: "reorder-callbacks", cites: "cancellation" }]))).toThrow(
      ScriptCitationError,
    );
  });

  it("refuses a behaviour with no citation", () => {
    const uncited = { behaviour: "reorder-callbacks" } as unknown as ScriptedBehaviour;
    expect(() => fake(FAKE_VIDEO_PROFILE, scripted([uncited]))).toThrow(ScriptCitationError);
  });

  it("refuses a behaviour whose declaration is unknown in the snapshot", () => {
    const undeclared = variant(FAKE_VIDEO_PROFILE, { runBehaviour: { errorMapping: { state: "unknown" } } });
    expect(() =>
      fake(undeclared, scripted([{ behaviour: "fail-at-submit", providerCode: "internal_error", message: "m", cites: "errorMapping" }])),
    ).toThrow(ScriptCitationError);
  });

  it("refuses a behaviour the declared value rules out", () => {
    // The image profile declares no webhook.
    expect(() => fake(FAKE_IMAGE_PROFILE, scripted([{ behaviour: "duplicate-callbacks", copies: 2, cites: "completionSignal" }]))).toThrow(
      ScriptCitationError,
    );
    expect(() => fake(FAKE_IMAGE_PROFILE, scripted([{ behaviour: "reorder-callbacks", cites: "completionSignal" }]))).toThrow(
      ScriptCitationError,
    );
    // A run longer than the declared maximum runtime.
    expect(() => fake(FAKE_VIDEO_PROFILE, scripted([{ behaviour: "run-for", ms: 30 * 60_000 + 1, cites: "completionSignal" }]))).toThrow(
      ScriptCitationError,
    );
    // A late result after a reliable cancel.
    const reliable = variant(FAKE_VIDEO_PROFILE, {
      runBehaviour: { cancellation: { state: "declared", value: "reliable", evidence: { kind: "assumed", reviewer: "t", reason: "t" } } },
    });
    expect(() => fake(reliable, scripted([{ behaviour: "complete-despite-cancel", cites: "cancellation" }]))).toThrow(ScriptCitationError);
  });
});

describe("FakeTransport is a test provider", () => {
  it("is branded fake, so it is never a RealAdapter", () => {
    const { transport } = fake(FAKE_VIDEO_PROFILE);
    const asFake: FakeAdapter = transport;
    // @ts-expect-error A fake is not assignable to the type the production composition root accepts.
    const asReal: RealAdapter = transport;
    expect(asFake.kind).toBe("fake");
    expect(asReal.profile.kind).toBe("fake");
  });

  it("refuses a profile snapshot of kind real", () => {
    expect(() => fake(variant(FAKE_VIDEO_PROFILE, { kind: "real" }))).toThrow(/kind fake/);
  });

  it("bills by the declared rule", () => {
    const video = fake(FAKE_VIDEO_PROFILE).transport;
    // Duration set {4, 6, 8}: the smallest member at or above the request.
    expect(video.billedQuantity(request({ durationSeconds: 7 }))).toStrictEqual({ unit: "second", amount: 8, bounds: { min: 8, max: 8 } });
    expect(video.billedQuantity(request({ durationSeconds: 4 })).amount).toBe(4);
    expect(video.billedQuantity(request({ durationSeconds: 4.5 })).amount).toBe(6);
    expect(() => video.billedQuantity(request({ durationSeconds: 9 }))).toThrow(RangeError);
    const image = fake(FAKE_IMAGE_PROFILE).transport;
    expect(image.billedQuantity(request({ count: 3 }))).toStrictEqual({ unit: "image", amount: 3, bounds: { min: 3, max: 3 } });
    expect(image.billedQuantity(request({})).amount).toBe(1);
  });
});

describe("fake output files are visibly and verifiably marked", () => {
  it("an image carries the burned-in TEST PROVIDER mark and the metadata tag", async () => {
    const { contentType, bytes } = await finishedOutput(FAKE_IMAGE_PROFILE, { count: 1 });
    expect(contentType).toBe("image/png");
    expect(pngTextChunks(bytes)["Aiuteur-Test-Provider"]).toBe("TEST PROVIDER");
    expect(readBlockText(decodeFirstFrame(bytes, "out.png"))).toBe("TEST PROVIDER");
  });

  it("a video carries the burned-in mark, a fixed tone and the metadata tag", async () => {
    const { contentType, bytes } = await finishedOutput(FAKE_VIDEO_PROFILE, { durationSeconds: 4 });
    expect(contentType).toBe("video/mp4");
    expect(formatTags(bytes, "out.mp4")).toMatchObject({ title: "TEST PROVIDER", comment: "Aiuteur-Test-Provider: TEST PROVIDER" });
    expect(readBlockText(decodeFirstFrame(bytes, "out.mp4"))).toBe("TEST PROVIDER");
    const audio = decodeAudio(bytes, "out.mp4");
    expect(audio.length).toBeGreaterThan(48_000);
    const tone = powerAt(audio, 1000);
    for (const other of [250, 500, 2000, 4000]) expect(tone).toBeGreaterThan(1000 * powerAt(audio, other));
  });
});
