import { createHash } from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { JobId } from "@aiuteur/contract";
import {
  canonicalJson,
  classifyProviderError,
  declaredValue,
  type CredentialHandle,
  type Declared,
  type NeutralStatus,
  type ObserveResult,
  type OperationReference,
  type OutputRef,
  type ProfileSnapshot,
  type ProviderTransport,
  type RenderedRequest,
  type ReportedCost,
  type RunBehaviour,
  type SubmitResult,
  type WireCapture,
} from "@aiuteur/providers";
import { testCredential, testJobId } from "../fake-profiles.ts";
import { FakeTransport, ManualClock } from "../fake-transport.ts";
import { ScriptCitationError, type ProviderScript } from "../script.ts";

// The ProviderTransport conformance suite (VERIFICATION-AND-OBSERVABILITY §3.3, FC11).
// A fake runs every case ("full"); a real adapter runs the probe subset live ("probe").

export interface ConformanceContext {
  readonly transport: ProviderTransport;
  readonly credential: CredentialHandle;
  /** Decodes a captured wire body back to request content, to prove Package P1. */
  readonly decodeWireBody: (capture: WireCapture) => unknown;
}

export interface FullConformanceContext extends ConformanceContext {
  readonly transport: FakeTransport;
  readonly clock: ManualClock;
}

/** A Rendered request to send, with the quantity the provider's documented pricing rule bills for it. */
export interface SuppliedRequest {
  readonly request: RenderedRequest;
  /** Derived by hand from the provider's documentation, never from the adapter. */
  readonly billed: ReportedCost;
}

interface SubjectBase {
  readonly name: string;
  /** Requests valid for the subject's profile. */
  readonly suppliedRequests: readonly SuppliedRequest[];
}
export interface FullSubject extends SubjectBase {
  readonly mode: "full";
  setUp(scripts: readonly ProviderScript[]): FullConformanceContext;
}
export interface ProbeSubject extends SubjectBase {
  readonly mode: "probe";
  setUp(): ConformanceContext;
}
export type ProviderTransportSubject = FullSubject | ProbeSubject;

interface Case<S> {
  readonly title: string;
  readonly run: (subject: S) => Promise<void>;
}

/** Cases that run on every subject, including a real adapter's live probe. */
const PROBE_CASES: readonly Case<ProviderTransportSubject>[] = [
  {
    title: "P1 wire parity: the wire body decodes to the supplied Rendered request",
    async run(subject) {
      const ctx = subject.mode === "full" ? subject.setUp([]) : subject.setUp();
      for (const { request } of subject.suppliedRequests) {
        expect(ctx.decodeWireBody(ctx.transport.wireCapture(request))).toStrictEqual(request);
      }
      fc.assert(
        fc.property(arbitraryRenderedRequest, (request) => {
          expect(ctx.decodeWireBody(ctx.transport.wireCapture(request))).toStrictEqual(request);
        }),
      );
      if (subject.mode === "full") {
        const full = ctx as FullConformanceContext;
        for (const [index, { request }] of subject.suppliedRequests.entries()) {
          await submit(full, job("p1", index), request);
          expect(full.transport.control.sentWireBodies().at(-1)?.body).toStrictEqual(full.transport.wireCapture(request).body);
        }
      }
    },
  },
];

/** Cases that need scripted provider behaviour and virtual time: fakes only. */
const FULL_CASES: readonly Case<FullSubject>[] = [
  {
    title: "maps every documented error to its class, and anything else to Unknown, maybe billed",
    async run(subject) {
      const mapping = subject.setUp([]).transport.profile.runBehaviour.errorMapping;
      expect(mapping.state, "a fake documents its error map").toBe("declared");
      const documented = mapping.state === "declared" ? mapping.value : [];
      const codes = [...documented.map((e) => e.providerCode), "undocumented_provider_error"];
      const message = (code: string) => `Provider said: ${code} (as given)`;
      const ctx = subject.setUp(
        codes.flatMap((code) => [
          { jobId: job("refused", code), behaviours: [{ behaviour: "fail-at-submit", providerCode: code, message: message(code), cites: "errorMapping" }] },
          { jobId: job("failed", code), behaviours: [{ behaviour: "fail-while-running", providerCode: code, message: message(code), cites: "errorMapping" }] },
        ]),
      );
      const request = firstRequest(subject);
      for (const code of codes) {
        const expected = documented.find((e) => e.providerCode === code) ?? { failureClass: "unknown", billed: "maybe" };
        expect(await submit(ctx, job("refused", code), request)).toStrictEqual({
          outcome: "refused",
          failureClass: expected.failureClass,
          billed: expected.billed,
          providerReason: message(code),
        });
        const operation = accepted(await submit(ctx, job("failed", code), request));
        runToEnd(ctx);
        expect(statusOf(await poll(ctx, operation))).toStrictEqual({
          status: "failed",
          failureClass: expected.failureClass,
          billed: expected.billed,
          reason: message(code),
        });
      }
      expect(classifyProviderError({ state: "unknown" }, "anything")).toStrictEqual({ failureClass: "unknown", billed: "maybe" });
    },
  },
  {
    title: "submit is idempotent on the Job id",
    async run(subject) {
      const ctx = subject.setUp([]);
      const request = firstRequest(subject);
      const first = accepted(await submit(ctx, job("idem", "a"), request));
      const other = accepted(await submit(ctx, job("idem", "b"), request));
      expect(other).not.toBe(first);
      switch (declared(ctx, "idempotentSubmission")) {
        case "key": {
          expect(accepted(await submit(ctx, job("idem", "a"), request))).toBe(first);
          expect(ctx.transport.control.billableRuns()).toBe(2);
          break;
        }
        case "lookup": {
          expect(await lookup(ctx, job("idem", "a"))).toStrictEqual({ outcome: "found", operation: first });
          expect(await lookup(ctx, job("idem", "never-submitted"))).toStrictEqual({ outcome: "not-found" });
          expect(ctx.transport.control.billableRuns()).toBe(2);
          break;
        }
        case "neither":
          expect(await lookup(ctx, job("idem", "a"))).toStrictEqual({ outcome: "unsupported" });
          break;
      }
    },
  },
  {
    title: "accepting a run returns an operation reference that observe resolves",
    async run(subject) {
      const ctx = subject.setUp([]);
      const operation = accepted(await submit(ctx, job("ref", 1), firstRequest(subject)));
      expect(typeof operation === "string" && operation.length > 0).toBe(true);
      const early = await poll(ctx, operation);
      expect(early).toMatchObject({ outcome: "observed", operation, eventId: null });
      expect(["pending", "running"]).toContain(statusOf(early).status);
      runToEnd(ctx);
      expect(statusOf(await poll(ctx, operation)).status).toBe("succeeded");
      const unknown = await poll(ctx, "not-an-operation" as OperationReference);
      expect(statusOf(unknown).status).toBe("unknown");
    },
  },
  {
    title: "webhooks: signatures are verified, duplicates and out-of-order deliveries are identifiable",
    async run(subject) {
      const signal = declared(subject.setUp([]), "completionSignal");
      const request = firstRequest(subject);
      if (signal.webhook !== "verifiable") {
        // No webhook, or one that cannot be verified: no callback is ever trusted; polling decides.
        const ctx = subject.setUp([]);
        await submit(ctx, job("hook", "unverified"), request);
        runToEnd(ctx);
        const callbacks = ctx.transport.control.takeCallbacks();
        if (signal.webhook === "none") expect(callbacks).toStrictEqual([]);
        for (const callback of [...callbacks, { headers: {}, body: new TextEncoder().encode("{}") }]) {
          expect(await observeCallback(ctx, callback)).toStrictEqual({ outcome: "rejected", reason: "signature-invalid" });
        }
        return;
      }
      const ctx = subject.setUp([
        { jobId: job("hook", "dup"), behaviours: [{ behaviour: "duplicate-callbacks", copies: 3, cites: "completionSignal" }] },
        { jobId: job("hook", "ooo"), behaviours: [{ behaviour: "reorder-callbacks", cites: "completionSignal" }] },
      ]);

      // In order: running, then succeeded, each with its own event id.
      const plain = accepted(await submit(ctx, job("hook", "plain"), request));
      const [started, ...noMore] = ctx.transport.control.takeCallbacks();
      expect(noMore).toStrictEqual([]);
      const startedObs = await observeCallback(ctx, started!);
      expect(startedObs).toMatchObject({ outcome: "observed", operation: plain, status: { status: "running" } });
      runToEnd(ctx);
      const [finished] = ctx.transport.control.takeCallbacks();
      const finishedObs = await observeCallback(ctx, finished!);
      expect(finishedObs).toMatchObject({ outcome: "observed", operation: plain, status: { status: "succeeded" } });
      expect(eventIdOf(finishedObs)).not.toBe(eventIdOf(startedObs));

      // Signatures: a changed body, a missing signature or another body's signature are rejected.
      const tampered = { ...finished!, body: Uint8Array.from(finished!.body, (b, i) => (i === finished!.body.length - 2 ? b ^ 1 : b)) };
      const unsigned = { headers: { "content-type": "application/json" }, body: finished!.body };
      const swapped = { headers: started!.headers, body: finished!.body };
      for (const forged of [tampered, unsigned, swapped]) {
        expect(await observeCallback(ctx, forged)).toStrictEqual({ outcome: "rejected", reason: "signature-invalid" });
      }

      // Duplicates: every copy decodes to the same (operation, event id) and status.
      const dup = accepted(await submit(ctx, job("hook", "dup"), request));
      runToEnd(ctx);
      const dupObs = await Promise.all(ctx.transport.control.takeCallbacks().map((c) => observeCallback(ctx, c)));
      const byEvent = Map.groupBy(dupObs, (o) => eventIdOf(o));
      expect(byEvent.size).toBe(2);
      for (const copies of byEvent.values()) {
        expect(copies).toHaveLength(3);
        expect(copies.every((o) => canonicalJson(o) === canonicalJson(copies[0]))).toBe(true);
        expect(copies[0]).toMatchObject({ outcome: "observed", operation: dup });
      }

      // Out of order: the terminal event arrives first; the late non-terminal one keeps its own
      // event id, so the Job's compare-and-set can discard it; a poll still reads terminal.
      const ooo = accepted(await submit(ctx, job("hook", "ooo"), request));
      runToEnd(ctx);
      const oooObs = await Promise.all(ctx.transport.control.takeCallbacks().map((c) => observeCallback(ctx, c)));
      expect(oooObs.map((o) => statusOf(o).status)).toStrictEqual(["succeeded", "running"]);
      expect(new Set(oooObs.map(eventIdOf)).size).toBe(2);
      expect(statusOf(await poll(ctx, ooo)).status).toBe("succeeded");
    },
  },
  {
    title: "expired output URLs are reported as expired, never as output",
    async run(subject) {
      const ctx = subject.setUp([]);
      const { urlLifetimeMs, windowMs } = declared(ctx, "outputRetention");
      const operation = accepted(await submit(ctx, job("expiry", 1), firstRequest(subject)));
      runToEnd(ctx);
      const [output] = outputsOf(await poll(ctx, operation));
      expect((await fetchBytes(ctx, output!)).length).toBeGreaterThan(0);

      ctx.clock.advance(urlLifetimeMs);
      expect(await ctx.transport.fetch({ credential: ctx.credential, output: output! })).toStrictEqual({ outcome: "expired" });
      if (urlLifetimeMs < windowMs) {
        const [fresh] = outputsOf(await poll(ctx, operation));
        expect(fresh!.url).not.toBe(output!.url);
        expect((await fetchBytes(ctx, fresh!)).length).toBeGreaterThan(0);
      }

      ctx.clock.advance(windowMs);
      const [late] = outputsOf(await poll(ctx, operation));
      expect(await ctx.transport.fetch({ credential: ctx.credential, output: late! })).toStrictEqual({ outcome: "expired" });
    },
  },
  {
    title: "cancel follows the declared cancellation: none, best effort or reliable",
    async run(subject) {
      const ctx = subject.setUp([]);
      const cancellation = declared(ctx, "cancellation");
      const billingOnCancel = declared(ctx, "billingOnCancel");
      const operation = accepted(await submit(ctx, job("cancel", 1), firstRequest(subject)));
      ctx.clock.advance(1);
      const result = await ctx.transport.cancel({ credential: ctx.credential, operation });
      runToEnd(ctx);
      const after = statusOf(await poll(ctx, operation));
      switch (cancellation) {
        case "none":
          expect(result).toStrictEqual({ outcome: "cannot-cancel", billing: billingOnCancel });
          expect(after.status).toBe("succeeded");
          break;
        case "best-effort":
          expect(result).toStrictEqual({ outcome: "cancelled", billing: billingOnCancel });
          expect(after).toStrictEqual({ status: "cancelled", billing: billingOnCancel });
          break;
        case "reliable":
          expect(result).toStrictEqual({ outcome: "cancelled", billing: "none" });
          expect(after).toStrictEqual({ status: "cancelled", billing: "none" });
          break;
      }
    },
  },
  {
    title: "a late result after cancel is still observable and fetchable",
    async run(subject) {
      const behaviour = { behaviour: "complete-despite-cancel", cites: "cancellation" } as const;
      if (declared(subject.setUp([]), "cancellation") === "reliable") {
        expect(() => subject.setUp([{ jobId: job("late", 1), behaviours: [behaviour] }])).toThrow(ScriptCitationError);
        return;
      }
      const ctx = subject.setUp([{ jobId: job("late", 1), behaviours: [behaviour] }]);
      const { request, billed } = firstSupplied(subject);
      const operation = accepted(await submit(ctx, job("late", 1), request));
      ctx.clock.advance(1);
      const cancel = await ctx.transport.cancel({ credential: ctx.credential, operation });
      expect(cancel.billing).not.toBe("none");
      runToEnd(ctx);
      const status = statusOf(await poll(ctx, operation));
      expect(status.status).toBe("succeeded");
      const [output] = outputsOf({ outcome: "observed", operation, eventId: null, status });
      expect((await fetchBytes(ctx, output!)).length).toBeGreaterThan(0);
      if (status.status === "succeeded" && status.reportedCost !== null) expect(status.reportedCost).toStrictEqual(billed);
    },
  },
  {
    title: "a maybe-billed submission can be reconciled",
    async run(subject) {
      const lost = job("reconcile", "lost");
      const ctx = subject.setUp([{ jobId: lost, behaviours: [{ behaviour: "lose-submit-response", cites: "idempotentSubmission" }] }]);
      const { request, billed } = firstSupplied(subject);
      expect(await submit(ctx, lost, request)).toStrictEqual({ outcome: "unconfirmed" });
      expect(ctx.transport.control.billableRuns()).toBe(1);
      let operation: OperationReference;
      switch (declared(ctx, "idempotentSubmission")) {
        case "key":
          operation = accepted(await submit(ctx, lost, request));
          break;
        case "lookup": {
          const found = await lookup(ctx, lost);
          expect(found.outcome).toBe("found");
          operation = (found as { operation: OperationReference }).operation;
          break;
        }
        case "neither":
          expect(await lookup(ctx, lost)).toStrictEqual({ outcome: "unsupported" });
          return;
      }
      expect(ctx.transport.control.billableRuns()).toBe(1);
      runToEnd(ctx);
      const status = statusOf(await poll(ctx, operation));
      expect(status.status).toBe("succeeded");
      if (status.status === "succeeded" && status.reportedCost !== null) expect(status.reportedCost).toStrictEqual(billed);
    },
  },
  {
    title: "the billed quantity is honest: the provider bills what billed-quantity estimated",
    async run(subject) {
      const ctx = subject.setUp([]);
      const rule = ctx.transport.profile.cost.billedQuantity;
      const reported = ctx.transport.profile.cost.actualCostReported;
      expect(rule.state).toBe("declared");
      for (const [index, { request, billed }] of subject.suppliedRequests.entries()) {
        const estimate = ctx.transport.billedQuantity(request);
        if (rule.state === "declared") expect(estimate.unit).toBe(rule.value.unit);
        expect({ unit: estimate.unit, amount: estimate.amount }).toStrictEqual(billed);
        expect(estimate.bounds.min).toBeLessThanOrEqual(estimate.amount);
        expect(estimate.amount).toBeLessThanOrEqual(estimate.bounds.max);
        const operation = accepted(await submit(ctx, job("billed", index), request));
        runToEnd(ctx);
        const status = statusOf(await poll(ctx, operation));
        if (status.status !== "succeeded") throw new Error(`expected success, got ${status.status}`);
        if (reported.state === "declared" && reported.value) {
          expect(status.reportedCost?.unit).toBe(estimate.unit);
          expect(status.reportedCost!.amount).toBeGreaterThanOrEqual(estimate.bounds.min);
          expect(status.reportedCost!.amount).toBeLessThanOrEqual(estimate.bounds.max);
        } else {
          expect(status.reportedCost).toBeNull();
        }
      }
    },
  },
];

/** Registers the suite for one subject: every case for a fake, the probe subset for a real adapter. */
export function describeProviderTransportConformance(subject: ProviderTransportSubject): void {
  describe(`ProviderTransport conformance: ${subject.name} (${subject.mode})`, () => {
    for (const c of PROBE_CASES) it(c.title, () => c.run(subject));
    if (subject.mode === "full") for (const c of FULL_CASES) it(c.title, () => c.run(subject));
  });
}

/** A conformance subject for a FakeTransport parameterised by `profile`. */
export function fakeTransportSubject(
  name: string,
  profile: ProfileSnapshot,
  suppliedRequests: readonly SuppliedRequest[],
): FullSubject {
  return {
    name,
    mode: "full",
    suppliedRequests,
    setUp(scripts) {
      const clock = new ManualClock();
      return {
        transport: new FakeTransport({ profile, clock, webhookSecret: "conformance-webhook-secret", scripts }),
        clock,
        credential: testCredential(),
        decodeWireBody: (capture) => JSON.parse(new TextDecoder().decode(capture.body)),
      };
    },
  };
}

// Plain objects, as the compiler produces them.
const plain = { noNullPrototype: true } as const;
const arbitraryRenderedRequest: fc.Arbitrary<RenderedRequest> = fc.record({
  textParts: fc.array(
    fc.record({ layerKey: fc.string(), text: fc.string({ unit: "grapheme" }), layerDigest: fc.string() }, plain),
  ),
  mediaParts: fc.array(
    fc.record({ mediaId: fc.string(), contentHash: fc.string(), role: fc.string(), position: fc.nat() }, plain),
  ),
  parameters: fc.dictionary(
    fc.string(),
    fc.oneof(
      fc.string({ unit: "grapheme" }),
      fc.integer(),
      fc.boolean(),
      fc.double({ noNaN: true, noDefaultInfinity: true }).filter((n) => !Object.is(n, -0)),
    ),
    plain,
  ),
  rewrites: fc.array(fc.string()),
}, plain);

function job(caseId: string, n: string | number): JobId {
  return testJobId(`${caseId}-${n}`);
}

function firstSupplied(subject: SubjectBase): SuppliedRequest {
  const supplied = subject.suppliedRequests[0];
  if (supplied === undefined) throw new Error("a conformance subject supplies at least one Rendered request");
  return supplied;
}

function firstRequest(subject: SubjectBase): RenderedRequest {
  return firstSupplied(subject).request;
}

function record(request: RenderedRequest) {
  return { digest: `sha256:${createHash("sha256").update(canonicalJson(request)).digest("hex")}`, request };
}

function submit(ctx: ConformanceContext, jobId: JobId, request: RenderedRequest): Promise<SubmitResult> {
  return ctx.transport.submit({ request: record(request), credential: ctx.credential, idempotencyKey: jobId });
}

function poll(ctx: ConformanceContext, operation: OperationReference): Promise<ObserveResult> {
  return ctx.transport.observe({ via: "poll", credential: ctx.credential, operation });
}

function observeCallback(ctx: ConformanceContext, callback: { headers: Readonly<Record<string, string>>; body: Uint8Array }) {
  return ctx.transport.observe({ via: "callback", credential: ctx.credential, callback });
}

function lookup(ctx: ConformanceContext, correlationId: JobId) {
  return ctx.transport.lookup({ credential: ctx.credential, correlationId });
}

function accepted(result: SubmitResult): OperationReference {
  if (result.outcome !== "accepted") throw new Error(`expected accepted, got ${JSON.stringify(result)}`);
  return result.operation;
}

function statusOf(result: ObserveResult): NeutralStatus {
  if (result.outcome !== "observed") throw new Error(`expected a status, got ${JSON.stringify(result)}`);
  return result.status;
}

function eventIdOf(result: ObserveResult): string | null {
  if (result.outcome !== "observed") throw new Error(`expected a status, got ${JSON.stringify(result)}`);
  return result.eventId;
}

function outputsOf(result: ObserveResult): readonly OutputRef[] {
  const status = statusOf(result);
  if (status.status !== "succeeded") throw new Error(`expected success, got ${status.status}`);
  expect(status.outputs.length).toBeGreaterThan(0);
  return status.outputs;
}

async function fetchBytes(ctx: ConformanceContext, output: OutputRef): Promise<Uint8Array> {
  const result = await ctx.transport.fetch({ credential: ctx.credential, output });
  if (result.outcome !== "fetched") throw new Error(`expected bytes, got ${result.outcome}`);
  return new Uint8Array(await new Response(result.body).arrayBuffer());
}

type Resolved<F extends keyof RunBehaviour> = RunBehaviour[F] extends Declared<infer T> ? T : never;

function declared<F extends keyof RunBehaviour>(ctx: ConformanceContext, field: F): Resolved<F> {
  const value = declaredValue<Resolved<F>>(ctx.transport.profile.runBehaviour[field] as Declared<Resolved<F>>);
  if (value === undefined) throw new Error(`the suite needs runBehaviour.${field} declared`);
  return value;
}

/** Advances virtual time past any run the profile allows. */
function runToEnd(ctx: FullConformanceContext): void {
  ctx.clock.advance(declared(ctx, "completionSignal").maxRuntimeMs);
}
