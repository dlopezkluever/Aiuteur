import type { ErrorSink, Logger } from "@aiuteur/observability";
import type { Heartbeat } from "./heartbeat.ts";

export interface WorkerLoop {
  /** Records the worker's proof of life in the database; throws when it cannot. */
  check(): Promise<void>;
  heartbeat: Heartbeat;
  logger: Logger;
  sink: ErrorSink;
  intervalMs: number;
  signal: AbortSignal;
}

/**
 * The worker role's loop at T0d. It proves the process is alive and the database reachable, and tells the external
 * monitor so only when both are true. It claims no Job: the step executors belong to the tickets that build them, and
 * RT6 means a stopped worker costs liveness only.
 */
export async function runWorker(loop: WorkerLoop): Promise<void> {
  loop.logger.info("worker.started");
  // The liveness tick must never wait on the external monitor: a slow or unreachable monitor would otherwise make a healthy
  // worker look stale. One ping is in flight at most; a tick that finds one still pending sends none.
  let pinging = false;
  const ping = (started: number) => {
    if (pinging) return;
    pinging = true;
    void loop.heartbeat.ping().then(
      (ok) => { if (ok) loop.logger.info("heartbeat.sent", { durationMs: Date.now() - started }); else loop.logger.warn("heartbeat.failed"); },
      () => loop.logger.warn("heartbeat.failed"),
    ).finally(() => { pinging = false; });
  };
  while (!loop.signal.aborted) {
    const started = Date.now();
    try {
      await loop.check();
      ping(started);
    } catch (error) {
      // No ping: the monitor's silence is how a broken worker is noticed.
      loop.logger.error("worker.tick-failed", { code: "check-failed" });
      loop.sink.capture(error, { code: "check-failed" });
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, loop.intervalMs);
      loop.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
    });
  }
  loop.logger.info("worker.stopped");
}
