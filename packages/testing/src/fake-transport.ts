import { createHmac, timingSafeEqual } from "node:crypto";
import { CANCEL_BILLING, type CancelBilling, type JobId } from "@aiuteur/contract";
import {
  billedQuantityFor,
  canonicalJson,
  classifyProviderError,
  declaredValue,
  type Declared,
  type BilledQuantity,
  type MediaBilledQuantityRule,
  type CancelResult,
  type CredentialHandle,
  type FetchResult,
  type InboundCallback,
  type LookupResult,
  type NeutralStatus,
  type ObserveInput,
  type ObserveResult,
  type OperationReference,
  type OutputRef,
  type ProfileSnapshot,
  type ProviderTransport,
  type RenderedRequest,
  type RunBehaviour,
  type SubmitInput,
  type SubmitResult,
  type WireCapture,
} from "@aiuteur/providers";
import { fakeOutput, outputKindOf, type FakeOutputKind } from "./fake-outputs.ts";
import { validateScripts, type ProviderScript, type ScriptedBehaviour } from "./script.ts";

/** Virtual time for the fake. Draft: the Clock+Ids port (FC5) and its virtual time arrive with T0's Scheduler work. */
export interface FakeClock {
  now(): number;
}

export class ManualClock implements FakeClock {
  #now: number;
  constructor(start = Date.UTC(2026, 0, 1)) {
    this.#now = start;
  }
  now(): number {
    return this.#now;
  }
  advance(ms: number): void {
    if (!(ms >= 0)) throw new RangeError("time only moves forward");
    this.#now += ms;
  }
}

export interface FakeTransportOptions {
  /** The profile snapshot the fake is parameterised by. Its `kind` must be `fake`. */
  readonly profile: ProfileSnapshot;
  readonly clock: FakeClock;
  /** The secret the fake signs its callbacks with. */
  readonly webhookSecret: string;
  readonly scripts?: readonly ProviderScript[];
}

/** Test-only controls: what the fake provider sent and billed, and its pending callbacks. */
export interface FakeControl {
  /** Callbacks due by now and not yet delivered, in delivery order (scripted duplicates and reordering applied). */
  takeCallbacks(): InboundCallback[];
  /** Provider runs started, each of which the provider bills. */
  billableRuns(): number;
  /** Every wire body sent by `submit`, in order. */
  sentWireBodies(): readonly { readonly jobId: JobId; readonly body: Uint8Array }[];
}

type Resolved<F extends keyof RunBehaviour> = RunBehaviour[F] extends Declared<infer T> ? T : never;

interface Run {
  readonly operation: OperationReference;
  readonly jobId: JobId;
  readonly acceptedAt: number;
  readonly completesAt: number;
  readonly failure: { readonly providerCode: string; readonly message: string } | null;
  readonly billed: BilledQuantity;
  readonly completesDespiteCancel: boolean;
  readonly reorderCallbacks: boolean;
  readonly callbackCopies: number;
  cancelledAt: number | null;
  callbacksDelivered: number;
}

/** The provider's own event shape: the fake's wire dialect for statuses and callbacks. */
type ProviderEvent = { readonly operation: string; readonly eventId: string; readonly at: number } & (
  | { readonly state: "processing" }
  | { readonly state: "completed" }
  | { readonly state: "error"; readonly errorCode: string; readonly message: string }
  | { readonly state: "canceled"; readonly cancelBilling: CancelBilling }
);

const SIGNATURE_HEADER = "x-fake-signature";
const OUTPUT_SCHEME = "fake-output:";

/**
 * The test provider (FC11). Every provider fake is, or extends, this class, lives in
 * `testing/`, and carries `kind: fake` (build rule R19). It produces watermarked
 * synthetic output, follows its profile snapshot's run behaviour, plays scripted
 * behaviours that cite that snapshot, and captures what it would send.
 */
export class FakeTransport implements ProviderTransport<"fake"> {
  readonly kind = "fake" as const;
  readonly profile: ProfileSnapshot & { readonly kind: "fake" };
  readonly control: FakeControl;

  readonly #clock: FakeClock;
  readonly #secret: string;
  readonly #scripts: ReadonlyMap<JobId, readonly ScriptedBehaviour[]>;
  readonly #outputKind: FakeOutputKind;
  readonly #rule: MediaBilledQuantityRule;
  readonly #rb: {
    readonly idempotentSubmission: Resolved<"idempotentSubmission">;
    readonly completionSignal: Resolved<"completionSignal">;
    readonly cancellation: Resolved<"cancellation">;
    readonly outputRetention: Resolved<"outputRetention">;
    readonly billingOnCancel: Resolved<"billingOnCancel">;
  };
  readonly #runs = new Map<OperationReference, Run>();
  readonly #runsByJob = new Map<JobId, OperationReference[]>();
  readonly #sent: { jobId: JobId; body: Uint8Array }[] = [];

  constructor(options: FakeTransportOptions) {
    const { profile } = options;
    if (profile.kind !== "fake") throw new Error("a FakeTransport needs a profile snapshot of kind fake");
    validateScripts(profile, options.scripts ?? []);
    this.profile = profile as ProfileSnapshot & { readonly kind: "fake" };
    this.#clock = options.clock;
    this.#secret = options.webhookSecret;
    this.#scripts = new Map((options.scripts ?? []).map((s) => [s.jobId, s.behaviours]));
    this.#outputKind = outputKindOf(profile.operationClasses);
    const rule = profile.cost.billedQuantity;
    if (rule.state !== "declared") throw new Error("a FakeTransport needs a declared billed-quantity rule");
    // Token-priced text bills two quantities; the single-quantity adapter face serves media until #102's text fake.
    if (rule.value.rule === "text-tokens") throw new Error("a FakeTransport serves media billed-quantity rules only");
    this.#rule = rule.value;
    const rb = profile.runBehaviour;
    this.#rb = {
      idempotentSubmission: required(rb, "idempotentSubmission"),
      completionSignal: required(rb, "completionSignal"),
      cancellation: required(rb, "cancellation"),
      outputRetention: required(rb, "outputRetention"),
      billingOnCancel: required(rb, "billingOnCancel"),
    };
    this.control = {
      takeCallbacks: () => this.#takeCallbacks(),
      billableRuns: () => this.#runs.size,
      sentWireBodies: () => [...this.#sent],
    };
  }

  async submit({ request, idempotencyKey: jobId }: SubmitInput): Promise<SubmitResult> {
    const behaviours = this.#scripts.get(jobId) ?? [];
    this.#sent.push({ jobId, body: this.wireCapture(request.request).body });

    const refusal = find(behaviours, "fail-at-submit");
    if (refusal !== undefined) {
      return { outcome: "refused", ...this.#classify(refusal.providerCode), providerReason: refusal.message };
    }
    const earlier = this.#runsByJob.get(jobId) ?? [];
    const existing = earlier.at(-1);
    if (this.#rb.idempotentSubmission === "key" && existing !== undefined) {
      return { outcome: "accepted", operation: existing };
    }

    const now = this.#clock.now();
    const operation = `fake-op:${jobId}:${earlier.length + 1}` as OperationReference;
    const failure = find(behaviours, "fail-while-running");
    this.#runs.set(operation, {
      operation,
      jobId,
      acceptedAt: now,
      completesAt: now + (find(behaviours, "run-for")?.ms ?? this.#defaultRunMs()),
      failure: failure === undefined ? null : { providerCode: failure.providerCode, message: failure.message },
      billed: this.billedQuantity(request.request),
      completesDespiteCancel: find(behaviours, "complete-despite-cancel") !== undefined,
      reorderCallbacks: find(behaviours, "reorder-callbacks") !== undefined,
      callbackCopies: find(behaviours, "duplicate-callbacks")?.copies ?? 1,
      cancelledAt: null,
      callbacksDelivered: 0,
    });
    this.#runsByJob.set(jobId, [...earlier, operation]);

    if (earlier.length === 0 && find(behaviours, "lose-submit-response") !== undefined) {
      return { outcome: "unconfirmed" };
    }
    return { outcome: "accepted", operation };
  }

  async observe(input: ObserveInput): Promise<ObserveResult> {
    if (input.via === "poll") {
      const run = this.#runs.get(input.operation);
      if (run === undefined) {
        return { outcome: "observed", operation: input.operation, eventId: null, status: { status: "unknown", reason: "operation not found" } };
      }
      const event = this.#eventsDue(run).at(-1);
      const status: NeutralStatus = event === undefined ? { status: "pending" } : this.#toNeutral(run, event);
      return { outcome: "observed", operation: run.operation, eventId: null, status };
    }
    return this.#observeCallback(input.callback);
  }

  async cancel({ operation }: { readonly credential: CredentialHandle; readonly operation: OperationReference }): Promise<CancelResult> {
    const run = this.#runs.get(operation);
    if (run === undefined) return { outcome: "unknown", billing: "maybe" };
    const now = this.#clock.now();
    if (now >= run.completesAt || run.cancelledAt !== null || this.#rb.cancellation === "none") {
      return { outcome: "cannot-cancel", billing: this.#rb.billingOnCancel };
    }
    run.cancelledAt = now;
    return { outcome: "cancelled", billing: this.#cancelledBilling() };
  }

  /** What a cancelled run costs: nothing for a reliable cancel, the declared billing otherwise. */
  #cancelledBilling(): CancelBilling {
    return this.#rb.cancellation === "reliable" ? "none" : this.#rb.billingOnCancel;
  }

  async lookup({ correlationId }: { readonly credential: CredentialHandle; readonly correlationId: JobId }): Promise<LookupResult> {
    if (this.#rb.idempotentSubmission !== "lookup") return { outcome: "unsupported" };
    const operation = this.#runsByJob.get(correlationId)?.at(-1);
    return operation === undefined ? { outcome: "not-found" } : { outcome: "found", operation };
  }

  async fetch({ output }: { readonly credential: CredentialHandle; readonly output: OutputRef }): Promise<FetchResult> {
    const parsed = parseOutputUrl(output.url);
    const run = parsed === null ? undefined : this.#runs.get(parsed.operation);
    if (parsed === null || run === undefined) return { outcome: "not-found" };
    if (this.#clock.now() >= parsed.expires) return { outcome: "expired" };
    if (this.#eventsDue(run).at(-1)?.state !== "completed") return { outcome: "not-found" };
    const { contentType, bytes } = await fakeOutput(this.#outputKind, run.operation);
    return {
      outcome: "fetched",
      contentType,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    };
  }

  billedQuantity(request: RenderedRequest): BilledQuantity {
    return billedQuantityFor(this.#rule, request);
  }

  wireCapture(request: RenderedRequest): WireCapture {
    return { contentType: "application/json", body: new TextEncoder().encode(canonicalJson(request)) };
  }

  #defaultRunMs(): number {
    return Math.min(2 * this.#rb.completionSignal.pollMinIntervalMs, this.#rb.completionSignal.maxRuntimeMs);
  }

  #classify(providerCode: string) {
    return classifyProviderError(this.profile.runBehaviour.errorMapping, providerCode);
  }

  /** The provider's events for a run, in the order they happened, up to now. */
  #eventsDue(run: Run): ProviderEvent[] {
    const events: ProviderEvent[] = [
      { operation: run.operation, eventId: `${run.operation}#1`, at: run.acceptedAt, state: "processing" },
    ];
    const id = `${run.operation}#2`;
    if (run.cancelledAt !== null && !run.completesDespiteCancel) {
      events.push({ operation: run.operation, eventId: id, at: run.cancelledAt, state: "canceled", cancelBilling: this.#cancelledBilling() });
    } else if (run.failure !== null) {
      events.push({ operation: run.operation, eventId: id, at: run.completesAt, state: "error", errorCode: run.failure.providerCode, message: run.failure.message });
    } else {
      events.push({ operation: run.operation, eventId: id, at: run.completesAt, state: "completed" });
    }
    const now = this.#clock.now();
    return events.filter((e) => e.at <= now);
  }

  #toNeutral(run: Run, event: ProviderEvent): NeutralStatus {
    switch (event.state) {
      case "processing":
        return { status: "running" };
      case "completed":
        return {
          status: "succeeded",
          outputs: this.#issueOutputs(run),
          echoedPrompt: null,
          effectiveSeed: null,
          reportedCost: this.#reportsCost() ? { unit: run.billed.unit, amount: run.billed.amount } : null,
        };
      case "error":
        return { status: "failed", ...this.#classify(event.errorCode), reason: event.message };
      case "canceled":
        return { status: "cancelled", billing: event.cancelBilling };
    }
  }

  #reportsCost(): boolean {
    const declared = this.profile.cost.actualCostReported;
    return declared.state === "declared" && declared.value;
  }

  /** Fresh output URLs, valid for the declared URL lifetime and never past the retention window. */
  #issueOutputs(run: Run): OutputRef[] {
    const now = this.#clock.now();
    const { urlLifetimeMs, windowMs } = this.#rb.outputRetention;
    const expires = Math.min(now + urlLifetimeMs, run.completesAt + windowMs);
    const count = this.#outputKind === "image" ? run.billed.amount : 1;
    return Array.from({ length: count }, (_, index) => ({
      url: `${OUTPUT_SCHEME}//${encodeURIComponent(run.operation)}/${index}?expires=${expires}`,
      expiresAt: expires,
    }));
  }

  #takeCallbacks(): InboundCallback[] {
    if (this.#rb.completionSignal.webhook === "none") return [];
    const callbacks: InboundCallback[] = [];
    for (const run of this.#runs.values()) {
      const due = this.#eventsDue(run);
      const terminalDue = due.length === 2;
      if (run.reorderCallbacks && !terminalDue) continue;
      const pending = due.slice(run.callbacksDelivered);
      run.callbacksDelivered = due.length;
      const ordered = run.reorderCallbacks ? pending.reverse() : pending;
      for (const event of ordered) {
        for (let copy = 0; copy < run.callbackCopies; copy++) callbacks.push(this.#sign(event));
      }
    }
    return callbacks;
  }

  #sign(event: ProviderEvent): InboundCallback {
    const body = new TextEncoder().encode(JSON.stringify(event));
    return {
      headers: { "content-type": "application/json", [SIGNATURE_HEADER]: `t=${event.at},v1=${this.#mac(event.at, body)}` },
      body,
    };
  }

  #mac(timestamp: number, body: Uint8Array): string {
    return createHmac("sha256", this.#secret).update(`${timestamp}.`).update(body).digest("hex");
  }

  #observeCallback(callback: InboundCallback): ObserveResult {
    if (this.#rb.completionSignal.webhook !== "verifiable") return { outcome: "rejected", reason: "signature-invalid" };
    const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(callback.headers[SIGNATURE_HEADER] ?? "");
    if (match === null) return { outcome: "rejected", reason: "signature-invalid" };
    const expected = Buffer.from(this.#mac(Number(match[1]), callback.body), "hex");
    if (!timingSafeEqual(expected, Buffer.from(match[2] ?? "", "hex"))) {
      return { outcome: "rejected", reason: "signature-invalid" };
    }
    const event = parseProviderEvent(new TextDecoder().decode(callback.body));
    const run = event === null ? undefined : this.#runs.get(event.operation as OperationReference);
    if (event === null || run === undefined) return { outcome: "rejected", reason: "malformed" };
    const status: NeutralStatus =
      "unrecognised" in event
        ? { status: "unknown", reason: `unrecognised provider state ${event.unrecognised}` }
        : this.#toNeutral(run, event);
    return { outcome: "observed", operation: run.operation, eventId: event.eventId, status };
  }
}

function required<F extends keyof RunBehaviour>(rb: RunBehaviour, field: F): Resolved<F> {
  const value = declaredValue<Resolved<F>>(rb[field] as Declared<Resolved<F>>);
  if (value === undefined) throw new Error(`a FakeTransport needs runBehaviour.${field} declared`);
  return value;
}

/** Parses a callback body: malformed unless it names an operation and event; an unknown state reads as unknown (F4). */
function parseProviderEvent(text: string): ProviderEvent | { readonly unrecognised: string; readonly operation: string; readonly eventId: string } | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const { operation, eventId, at, state } = v;
  if (typeof operation !== "string" || typeof eventId !== "string" || typeof at !== "number") return null;
  const base = { operation, eventId, at };
  if (state === "processing" || state === "completed") return { ...base, state };
  if (state === "error" && typeof v["errorCode"] === "string" && typeof v["message"] === "string") {
    return { ...base, state, errorCode: v["errorCode"], message: v["message"] };
  }
  const billing = CANCEL_BILLING.find((b) => b === v["cancelBilling"]);
  if (state === "canceled" && billing !== undefined) return { ...base, state, cancelBilling: billing };
  return { operation, eventId, unrecognised: String(state) };
}

function find<B extends ScriptedBehaviour["behaviour"]>(
  behaviours: readonly ScriptedBehaviour[],
  behaviour: B,
): Extract<ScriptedBehaviour, { behaviour: B }> | undefined {
  return behaviours.find((b): b is Extract<ScriptedBehaviour, { behaviour: B }> => b.behaviour === behaviour);
}

function parseOutputUrl(url: string): { operation: OperationReference; expires: number } | null {
  const match = /^fake-output:\/\/([^/]+)\/\d+\?expires=(\d+)$/.exec(url);
  if (match === null) return null;
  return { operation: decodeURIComponent(match[1] ?? "") as OperationReference, expires: Number(match[2]) };
}
