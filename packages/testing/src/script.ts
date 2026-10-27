import type { JobId } from "@aiuteur/contract";
import { declaredValue, type ProfileSnapshot, type RunBehaviour, type RunBehaviourField } from "@aiuteur/providers";

// Scripted provider behaviours. Each one names the run-behaviour declaration of the
// profile snapshot it exercises (`cites`); a behaviour the snapshot does not declare
// cannot be scripted (VERIFICATION-AND-OBSERVABILITY §3.3, ADR 0026). Behaviours are
// content-free data so that later scenario scripts can carry them.

export type ScriptedBehaviour =
  /** The provider refuses the submission with this error. */
  | { readonly behaviour: "fail-at-submit"; readonly providerCode: string; readonly message: string; readonly cites: RunBehaviourField }
  /** The provider accepts, then reports this error when the run ends. */
  | { readonly behaviour: "fail-while-running"; readonly providerCode: string; readonly message: string; readonly cites: RunBehaviourField }
  /** The provider accepts and starts a run, but its response never arrives. */
  | { readonly behaviour: "lose-submit-response"; readonly cites: RunBehaviourField }
  /** Each callback is delivered `copies` times. */
  | { readonly behaviour: "duplicate-callbacks"; readonly copies: number; readonly cites: RunBehaviourField }
  /** Callbacks are delivered newest first. */
  | { readonly behaviour: "reorder-callbacks"; readonly cites: RunBehaviourField }
  /** A cancel is acknowledged or refused, and the run still completes and bills. */
  | { readonly behaviour: "complete-despite-cancel"; readonly cites: RunBehaviourField }
  /** The run takes this long. */
  | { readonly behaviour: "run-for"; readonly ms: number; readonly cites: RunBehaviourField };

/** The behaviours scripted for one Job's submissions. */
export interface ProviderScript {
  readonly jobId: JobId;
  readonly behaviours: readonly ScriptedBehaviour[];
}

export class ScriptCitationError extends Error {
  override readonly name = "ScriptCitationError";
}

const REQUIREMENTS: {
  readonly [B in ScriptedBehaviour["behaviour"]]: {
    readonly cites: RunBehaviourField;
    readonly permits: (rb: RunBehaviour, b: Extract<ScriptedBehaviour, { behaviour: B }>) => string | null;
  };
} = {
  "fail-at-submit": { cites: "errorMapping", permits: () => null },
  "fail-while-running": { cites: "errorMapping", permits: () => null },
  "lose-submit-response": { cites: "idempotentSubmission", permits: () => null },
  "duplicate-callbacks": {
    cites: "completionSignal",
    permits: (rb, b) =>
      webhook(rb) === "none" ? "the profile declares no webhook" : b.copies < 2 ? "copies must be at least 2" : null,
  },
  "reorder-callbacks": {
    cites: "completionSignal",
    permits: (rb) => (webhook(rb) === "none" ? "the profile declares no webhook" : null),
  },
  "complete-despite-cancel": {
    cites: "cancellation",
    permits: (rb) =>
      declaredValue(rb.cancellation) === "reliable" ? "the profile declares reliable cancellation" : null,
  },
  "run-for": {
    cites: "completionSignal",
    permits: (rb, b) => {
      const signal = declaredValue(rb.completionSignal);
      return b.ms > 0 && signal !== undefined && b.ms <= signal.maxRuntimeMs
        ? null
        : "the run time is outside the declared maximum runtime";
    },
  },
};

function webhook(rb: RunBehaviour) {
  return declaredValue(rb.completionSignal)?.webhook;
}

/** Throws `ScriptCitationError` unless every behaviour cites a declared run behaviour that permits it. */
export function validateScripts(profile: ProfileSnapshot, scripts: readonly ProviderScript[]): void {
  for (const script of scripts) {
    for (const behaviour of script.behaviours) {
      const requirement = REQUIREMENTS[behaviour.behaviour] as
        | { cites: RunBehaviourField; permits: (rb: RunBehaviour, b: ScriptedBehaviour) => string | null }
        | undefined;
      const where = `${script.jobId}: ${behaviour.behaviour}`;
      if (requirement === undefined) throw new ScriptCitationError(`${where} is not a known behaviour`);
      if (behaviour.cites !== requirement.cites) {
        throw new ScriptCitationError(`${where} must cite runBehaviour.${requirement.cites}, not ${String(behaviour.cites)}`);
      }
      if (profile.runBehaviour[requirement.cites].state !== "declared") {
        throw new ScriptCitationError(`${where} cites runBehaviour.${requirement.cites}, which the profile does not declare`);
      }
      const refusal = requirement.permits(profile.runBehaviour, behaviour);
      if (refusal !== null) throw new ScriptCitationError(`${where} is not permitted: ${refusal}`);
    }
  }
}
