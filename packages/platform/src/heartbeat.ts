/**
 * The worker's side of the external heartbeat (OPERATIONAL-BASELINE §7.2): after a healthy tick it requests a URL on a
 * monitor outside the host. A worker that is down sends nothing, and the monitor's silence is the alert. The monitor
 * alerts by a channel other than the application's own email.
 */
export interface Heartbeat { ping(): Promise<boolean> }

export function createHeartbeat(options: { url: string; fetch?: typeof fetch; timeoutMs?: number }): Heartbeat {
  const send = options.fetch ?? fetch;
  return {
    async ping() {
      try {
        const response = await send(options.url, { method: "GET", signal: AbortSignal.timeout(options.timeoutMs ?? 10_000) });
        return response.ok;
      } catch { return false; }
    },
  };
}
