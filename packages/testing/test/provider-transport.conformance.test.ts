import { describe, expect, it } from "vitest";
import type { RenderedRequest } from "@aiuteur/providers";
import {
  describeProviderTransportConformance,
  FAKE_IMAGE_PROFILE,
  FAKE_TEXT_PROFILE,
  FAKE_VIDEO_PROFILE,
  fakeTransportSubject,
} from "@aiuteur/testing";

const takeRequest: RenderedRequest = {
  textParts: [
    { layerKey: "scaffold:operation", text: "Generate the shot.", layerDigest: "sha256:scaffold" },
    { layerKey: "action", text: "Mara crosses the rain-soaked platform — «vite».", layerDigest: "sha256:action" },
  ],
  mediaParts: [{ mediaId: "media-frame-1", contentHash: "sha256:frame", role: "frame.first", position: 0 }],
  parameters: { durationSeconds: 7, aspect: "16:9", audio: true },
  rewrites: [],
};

const frameRequest: RenderedRequest = {
  textParts: [{ layerKey: "identity:mara", text: "Mara, 30s, red coat.", layerDigest: "sha256:identity" }],
  mediaParts: [
    { mediaId: "media-ref-1", contentHash: "sha256:ref1", role: "identity", position: 0 },
    { mediaId: "media-ref-2", contentHash: "sha256:ref2", role: "environment", position: 1 },
  ],
  parameters: { count: 2, aspect: "16:9" },
  rewrites: ["prompt-may-be-expanded"],
};

const draftRequest: RenderedRequest = {
  textParts: [
    { layerKey: "scaffold:operation", text: "[[scaffold:operation]]\nDraft.\n[[/scaffold:operation]]\n", layerDigest: "sha256:scaffold" },
    { layerKey: "source-material", text: "[[source-material]]\n“Vite,” she says.\n[[/source-material]]\n", layerDigest: "sha256:source" },
  ],
  mediaParts: [],
  parameters: { maxOutputTokens: 2048 },
  rewrites: [],
};

// Billed quantities by hand from the profiles' rules: 7 s against the set {4, 6, 8} bills 8 s;
// two images bill two; token text bills its input in UTF-8 bytes (54 + 63, the curly quotes
// are 3 bytes each) and up to the 2,048 output tokens the request allows.
describeProviderTransportConformance(
  fakeTransportSubject("FakeTransport · video.take", FAKE_VIDEO_PROFILE, [{ request: takeRequest, billed: [{ unit: "second", amount: 8 }] }]),
);
describeProviderTransportConformance(
  fakeTransportSubject("FakeTransport · image.frame", FAKE_IMAGE_PROFILE, [{ request: frameRequest, billed: [{ unit: "image", amount: 2 }] }]),
);
describeProviderTransportConformance(
  fakeTransportSubject("FakeTransport · text.create", FAKE_TEXT_PROFILE, [{ request: draftRequest, billed: [{ unit: "input-token", amount: 117 }, { unit: "output-token", amount: 2048 }] }],
    (n) => Array.from({ length: n }, (_, i) => ({ operation: "treatment.draft", step: i + 1, response: "A synthetic Treatment, one paragraph long.", source: { kind: "synthetic", note: "conformance fixture" } }))),
);

describe("the fake profiles under conformance", () => {
  it("together exercise every run-behaviour variant VERIFICATION §3.3 names", () => {
    const values = (field: "completionSignal" | "cancellation" | "idempotentSubmission") =>
      [FAKE_VIDEO_PROFILE, FAKE_IMAGE_PROFILE, FAKE_TEXT_PROFILE].map((p) => {
        const d = p.runBehaviour[field];
        return d.state === "declared" ? d.value : d.state;
      });
    expect(values("completionSignal").map((v) => (typeof v === "object" ? v.webhook : v))).toEqual(
      expect.arrayContaining(["verifiable", "none"]),
    );
    expect(values("cancellation")).toEqual(expect.arrayContaining(["none", "best-effort"]));
    expect(values("idempotentSubmission")).toEqual(expect.arrayContaining(["key", "lookup", "neither"]));
  });
});
