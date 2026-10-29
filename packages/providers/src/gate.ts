import { DISPATCH_GATE_CLAUSES, type DispatchGateClause, type Environment, type Estimate, type FailureClass, type FitReport, type OfferingStatus, type OperationClass } from "@aiuteur/contract";
import type { CredentialHandle, TransportKind } from "./transport.ts";

// Draft FC7/FC10: F3, the dispatch gate (PROVIDERS-AND-MODELS §9; GENERATION-PACKAGE §3 step 6). One pure function,
// called by the single dispatch path immediately before `submit`. Its clauses are the ordered, closed list
// DISPATCH_GATE_CLAUSES; each fails closed and the first failing clause is the answer. Nothing is sent on a refusal.

export interface GateInput {
  readonly operationClass: OperationClass;
  /** The recorded Offering's operational status now, or undefined when the Catalogue no longer lists it. */
  readonly status: OfferingStatus | undefined;
  /** The snapshot recorded on the Generation, the Catalogue's current snapshot of that Offering, and the transport's. */
  readonly snapshot: { readonly recorded: string; readonly catalogue: string | undefined; readonly transport: string };
  readonly credential: CredentialHandle | null;
  readonly fit: FitReport;
  /** The digest the inspector showed when the creator acted from it (null with no inspector open), and the recorded digest. */
  readonly digest: { readonly expected: string | null; readonly recorded: string };
  readonly estimate: Estimate;
  /** Whether the creator confirmed an unknown estimate (BUSINESS §3). Confirmation is T0-06's; nothing confirms in T0-05. */
  readonly estimateConfirmed: boolean;
  readonly environment: Environment;
  readonly transportKind: TransportKind;
}

export type GateResult =
  | { readonly result: "pass" }
  | { readonly result: "refused"; readonly clause: DispatchGateClause; readonly failureClass: FailureClass; readonly reason: string };

/** Statuses that may dispatch (PROVIDERS §10.1: selectable). */
const DISPATCHABLE: readonly OfferingStatus[] = ["preview", "active", "deprecated"];
/** Voice work needs a current Voice authorisation (VOICE-AND-PERFORMANCE §2.3). No authorisation record exists before EI7, so it fails closed. */
const VOICE_WORK: readonly OperationClass[] = ["audio.transform", "audio.speech", "audio.voice"];

type Clause = (input: GateInput) => { readonly failureClass: FailureClass; readonly reason: string } | null;
const platform = (reason: string) => ({ failureClass: "platform-configuration" as const, reason });
const input = (reason: string) => ({ failureClass: "permanent-input" as const, reason });

/** The clauses, keyed by the closed list; `gate` walks DISPATCH_GATE_CLAUSES, so the order is the contract's. */
const CLAUSES: { readonly [C in DispatchGateClause]: Clause } = {
  status: (i) => (i.status !== undefined && DISPATCHABLE.includes(i.status) ? null : platform(`offering-status-${i.status ?? "absent"}`)),
  snapshot: (i) => (i.snapshot.recorded === i.snapshot.catalogue && i.snapshot.recorded === i.snapshot.transport ? null : platform("snapshot-mismatch")),
  credential: (i) => (i.credential !== null ? null : platform("credential-unavailable")),
  fit: (i) => (i.fit.blocked === null ? null : input(`fit-blocked-${i.fit.blocked.reason}`)),
  "inspector-digest": (i) => (i.digest.expected === null || i.digest.expected === i.digest.recorded ? null : input("inputs-changed-since-shown")),
  estimate: (i) => (i.estimate.form !== "unknown" || i.estimateConfirmed ? null : input("estimate-unknown-unconfirmed")),
  environment: (i) => (i.environment !== "production" || i.transportKind === "real" ? null : platform("fake-offering-in-production")),
  authorised: (i) => (!VOICE_WORK.includes(i.operationClass) ? null : platform("voice-authorisation-unavailable")),
};

export function gate(input: GateInput): GateResult {
  for (const clause of DISPATCH_GATE_CLAUSES) {
    const refused = CLAUSES[clause](input);
    if (refused) return { result: "refused", clause, ...refused };
  }
  return { result: "pass" };
}
