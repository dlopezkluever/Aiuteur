import { admitFields, type Deployment, type LogFields } from "./fields.ts";
import type { SecretRegistry } from "./secrets.ts";

/** Static message keys. A key is chosen from this list, so no runtime text can become a log message. */
export const LOG_KEYS = [
  "web.listening", "web.stopped", "web.request-failed",
  "worker.started", "worker.stopped", "worker.tick-failed",
  "heartbeat.sent", "heartbeat.failed",
  "error-sink.delivery-failed",
] as const;
export type LogKey = (typeof LOG_KEYS)[number];
export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info(key: LogKey, fields?: LogFields): void;
  warn(key: LogKey, fields?: LogFields): void;
  error(key: LogKey, fields?: LogFields): void;
}

export interface LoggerOptions extends Deployment {
  /** One JSON line per call; the composition root passes stdout's writer (the `console` ban stands). */
  write(line: string): void;
  clock: { now(): number };
  secrets: SecretRegistry;
}

/** OPERATIONAL-BASELINE §6: typed, structured, JSON to stdout, ids only. */
export function createLogger(options: LoggerOptions): Logger {
  const emit = (level: LogLevel, key: LogKey, input: LogFields | undefined) => {
    const { fields, dropped } = admitFields(input);
    const line = JSON.stringify({
      time: new Date(options.clock.now()).toISOString(), level, key,
      environment: options.environment, role: options.role, release: options.release,
      ...fields, ...(dropped > 0 ? { dropped } : {}),
    });
    options.write(`${options.secrets.scrub(line)}\n`);
  };
  return { info: (key, fields) => emit("info", key, fields), warn: (key, fields) => emit("warn", key, fields), error: (key, fields) => emit("error", key, fields) };
}
