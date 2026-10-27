import type { Billed, CancelBilling, FailureClass, JobId } from "@aiuteur/contract";
import type { BilledQuantity, BilledUnit, ProfileSnapshot } from "./profile.ts";

// Draft FC10: the adapter face `ProviderTransport` (PROVIDERS-AND-MODELS §7.2, §7.3).
// An adapter transports one recorded Rendered request and reports what happened in a
// closed vocabulary. It never picks a model, builds content, retries, holds state
// between calls, or reads a key or the environment.

/** `real` for a provider adapter, `fake` for a test provider (VERIFICATION-AND-OBSERVABILITY §3.2 line 1). */
export type TransportKind = "real" | "fake";

declare const credentialBrand: unique symbol;
/**
 * Opaque, unserialisable reference to a provider key for one Account and provider
 * surface. Draft placeholder: the credential seam (FC5, EI9) owns and mints it.
 */
export interface CredentialHandle {
  readonly [credentialBrand]: "CredentialHandle";
}

declare const operationBrand: unique symbol;
/** The provider's reference to an accepted run (JOB-LIFECYCLE §7). */
export type OperationReference = string & { readonly [operationBrand]: "OperationReference" };

/**
 * What an adapter is given to send (GENERATION-PACKAGE §2 step 4). Draft placeholder:
 * `compiler` owns this shape (FC8) and takes it over when it lands.
 */
export interface RenderedRequest {
  readonly textParts: readonly {
    readonly layerKey: string;
    readonly text: string;
    readonly layerDigest: string;
  }[];
  readonly mediaParts: readonly {
    readonly mediaId: string;
    readonly contentHash: string;
    readonly role: string;
    readonly position: number;
  }[];
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
  readonly rewrites: readonly string[];
}

/** A Rendered request as recorded on the Generation, identified by its stored digest (Package P1). */
export interface RecordedRenderedRequest {
  readonly digest: string;
  readonly request: RenderedRequest;
}

/** The body an adapter would send for a Rendered request (the `wire-capture` test hook). */
export interface WireCapture {
  readonly contentType: string;
  readonly body: Uint8Array;
}

/** A provider output: a transient reference, never a product reference (JOB-LIFECYCLE §10). */
export interface OutputRef {
  readonly url: string;
  readonly expiresAt: number | null;
}

/** What the provider reports it billed for a run. */
export interface ReportedCost {
  readonly unit: BilledUnit;
  readonly amount: number;
}

/** The neutral status set (PROVIDERS-AND-MODELS §7.2), plus `cancelled` (JOB-LIFECYCLE §6.1). */
export type NeutralStatus =
  | { readonly status: "pending" }
  | { readonly status: "running" }
  | {
      readonly status: "succeeded";
      readonly outputs: readonly OutputRef[];
      readonly echoedPrompt: string | null;
      readonly effectiveSeed: number | null;
      readonly reportedCost: ReportedCost | null;
    }
  | { readonly status: "failed"; readonly failureClass: FailureClass; readonly billed: Billed; readonly reason: string }
  | { readonly status: "cancelled"; readonly billing: CancelBilling }
  | { readonly status: "unknown"; readonly reason: string };

export interface SubmitInput {
  readonly request: RecordedRenderedRequest;
  readonly credential: CredentialHandle;
  /** The Job id: the idempotency key, or the correlation field where no key exists (JOB-LIFECYCLE §4). */
  readonly idempotencyKey: JobId;
}

export type SubmitResult =
  | { readonly outcome: "accepted"; readonly operation: OperationReference }
  | {
      readonly outcome: "refused";
      readonly failureClass: FailureClass;
      readonly billed: Billed;
      /** The provider's reason as given, never reworded. */
      readonly providerReason: string;
    }
  | { readonly outcome: "unconfirmed" };

/** A raw inbound provider callback, before verification. */
export interface InboundCallback {
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
}

export type ObserveInput =
  | { readonly via: "poll"; readonly credential: CredentialHandle; readonly operation: OperationReference }
  | { readonly via: "callback"; readonly credential: CredentialHandle; readonly callback: InboundCallback };

export type ObserveResult =
  | {
      readonly outcome: "observed";
      readonly operation: OperationReference;
      /** The provider event id of a callback; completion is idempotent on (operation, event id). Null for a poll. */
      readonly eventId: string | null;
      readonly status: NeutralStatus;
    }
  | { readonly outcome: "rejected"; readonly reason: "signature-invalid" | "malformed" };

export interface CancelResult {
  readonly outcome: "cancelled" | "cannot-cancel" | "unknown";
  readonly billing: CancelBilling;
}

export type LookupResult =
  | { readonly outcome: "found"; readonly operation: OperationReference }
  | { readonly outcome: "not-found" }
  | { readonly outcome: "unsupported" };

export type FetchResult =
  | { readonly outcome: "fetched"; readonly contentType: string; readonly body: ReadableStream<Uint8Array> }
  | { readonly outcome: "expired" }
  | { readonly outcome: "not-found" };

export interface ProviderTransport<K extends TransportKind = TransportKind> {
  readonly kind: K;
  /** The adapter's declarations: run behaviour, cost and error map. */
  readonly profile: ProfileSnapshot & { readonly kind: K };
  submit(input: SubmitInput): Promise<SubmitResult>;
  observe(input: ObserveInput): Promise<ObserveResult>;
  cancel(input: { readonly credential: CredentialHandle; readonly operation: OperationReference }): Promise<CancelResult>;
  lookup(input: { readonly credential: CredentialHandle; readonly correlationId: JobId }): Promise<LookupResult>;
  fetch(input: { readonly credential: CredentialHandle; readonly output: OutputRef }): Promise<FetchResult>;
  billedQuantity(request: RenderedRequest): BilledQuantity;
  wireCapture(request: RenderedRequest): WireCapture;
}

/** A real provider adapter. The production composition root accepts only this. */
export type RealAdapter = ProviderTransport<"real">;
/** A test provider. Only `FakeTransport` and its subclasses are this. */
export type FakeAdapter = ProviderTransport<"fake">;
