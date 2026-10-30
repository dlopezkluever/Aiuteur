/** `GET /healthz/deep` answers counts, ages and fixed words only, never content (OPERATIONAL-BASELINE §7.2). */
export interface DeepHealth {
  readonly ok: boolean;
  readonly environment: string;
  readonly release: string;
  readonly database: "ok" | "unreachable";
  readonly fakeOfferings: number;
  /** `never`: no tick has ever been recorded; `unknown`: the signal could not be read. */
  readonly worker: "fresh" | "stale" | "never" | "unknown";
  readonly workerAgeMs: number | null;
  /** Age of the oldest overdue due time (RUNTIME-PLATFORM §7), null when nothing is overdue. */
  readonly oldestOverdueMs: number | null;
  readonly overdue: "ok" | "late" | "unknown";
}

export interface DeepInputs {
  readonly environment: string;
  readonly release: string;
  readonly database: "ok" | "unreachable";
  readonly fakeOfferings: number;
  /** null when the database or the signal could not be read. */
  readonly liveness: { readonly workerAgeMs: number | null; readonly oldestOverdueMs: number | null } | null;
  readonly workerStaleAfterMs: number;
  readonly overdueAfterMs: number;
}

/** Green only when the database answers, no fake is loaded where it must not be, the worker ticked recently, and nothing is overdue past the threshold. */
export function judgeDeep(input: DeepInputs): DeepHealth {
  const { liveness } = input;
  const worker = liveness === null ? "unknown" : liveness.workerAgeMs === null ? "never" : liveness.workerAgeMs > input.workerStaleAfterMs ? "stale" : "fresh";
  const overdue = liveness === null ? "unknown" : liveness.oldestOverdueMs !== null && liveness.oldestOverdueMs > input.overdueAfterMs ? "late" : "ok";
  return {
    ok: input.database === "ok" && input.fakeOfferings === 0 && worker === "fresh" && overdue === "ok",
    environment: input.environment, release: input.release, database: input.database, fakeOfferings: input.fakeOfferings,
    worker, workerAgeMs: liveness?.workerAgeMs ?? null, oldestOverdueMs: liveness?.oldestOverdueMs ?? null, overdue,
  };
}
