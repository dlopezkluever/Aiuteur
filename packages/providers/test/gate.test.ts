import { describe, expect, it } from "vitest";
import { DISPATCH_GATE_CLAUSES, type DispatchGateClause } from "@aiuteur/contract";
import { gate, type CredentialHandle, type GateInput } from "@aiuteur/providers";

// F3 (PROVIDERS §9): the ordered, closed clause list; the first failing clause is the answer.
const passing: GateInput = {
  operationClass: "text.create", status: "active", snapshot: { recorded: "s", catalogue: "s", transport: "s" },
  credential: Object.freeze({}) as CredentialHandle, fit: { blocked: null } as GateInput["fit"], digest: { expected: null, recorded: "d" },
  estimate: { form: "range" } as GateInput["estimate"], estimateConfirmed: false, environment: "local", transportKind: "fake",
};
/** One way to fail each clause, alone. */
const failing: { readonly [C in DispatchGateClause]: Partial<GateInput> } = {
  status: { status: "retired" },
  snapshot: { snapshot: { recorded: "s", catalogue: "t", transport: "s" } },
  credential: { credential: null },
  fit: { fit: { blocked: { reason: "over-limit" } } as unknown as GateInput["fit"] },
  "inspector-digest": { digest: { expected: "other", recorded: "d" } },
  estimate: { estimate: { form: "unknown" } as GateInput["estimate"] },
  environment: { environment: "production" },
  authorised: { operationClass: "audio.speech" },
};

describe("F3 dispatch gate", () => {
  it("passes a dispatchable request, and each clause refuses on its own failure", () => {
    expect(gate(passing)).toEqual({ result: "pass" });
    for (const clause of DISPATCH_GATE_CLAUSES) expect(gate({ ...passing, ...failing[clause] }), clause).toMatchObject({ result: "refused", clause });
  });

  it("the earliest failing clause in the contract's order is the answer", () => {
    const order = [...DISPATCH_GATE_CLAUSES];
    expect(order).toEqual(["status", "snapshot", "credential", "fit", "inspector-digest", "estimate", "environment", "authorised"]);
    for (const [i, earlier] of order.entries()) for (const later of order.slice(i + 1)) {
      expect(gate({ ...passing, ...failing[later], ...failing[earlier] }), `${earlier} before ${later}`).toMatchObject({ clause: earlier });
    }
  });

  it("authorised() holds its reserved last position: it refuses only voice work, which nothing can authorise yet", () => {
    for (const operationClass of ["text.create", "image.frame", "video.take", "audio.lipsync"] as const) expect(gate({ ...passing, operationClass })).toEqual({ result: "pass" });
    expect(gate({ ...passing, operationClass: "audio.voice" })).toMatchObject({ clause: "authorised", failureClass: "platform-configuration" });
  });
});
