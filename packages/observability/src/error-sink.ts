import { admitFields, ID_FIELDS, type Deployment, type IdFields } from "./fields.ts";
import type { SecretRegistry } from "./secrets.ts";

/** What a caller may attach to a captured error: the tier A ids and a closed code, nothing else. */
export interface ErrorContext extends IdFields { readonly code?: string }

/**
 * OPERATIONAL-BASELINE §7.1: the `ErrorSink` port. Only violations of our own invariants and unclassified exceptions go
 * here; expected failures are product events. No vendor type crosses this interface (RT5).
 */
export interface ErrorSink {
  /** Never throws and never blocks the caller. */
  capture(error: unknown, context?: ErrorContext): void;
  /** Waits for events already captured, up to the timeout; used at shutdown. */
  flush(timeoutMs: number): Promise<void>;
}

export interface Frame { readonly function: string | null; readonly file: string; readonly line: number; readonly column: number }

/**
 * The deny-by-default shape (§7.1 rule 2): error class, closed code, stack frames, release, process role, environment
 * and the id tags. There is no message member: provider error text may echo a prompt (rule 3), and a message is
 * free text. Request bodies, headers, cookies, query strings, breadcrumbs and local variables have nowhere to go.
 */
export interface ScrubbedEvent {
  readonly errorClass: string;
  readonly code: string | null;
  readonly frames: readonly Frame[];
  readonly release: string;
  readonly role: string;
  readonly environment: string;
  readonly tags: Readonly<Record<string, string>>;
}

const CLASS_SHAPE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
/** A function name is an identifier path (`Class.method`, `Object.<anonymous>`); a name with a space or punctuation is free text and is dropped. */
const FUNCTION_SHAPE = /^(?:[A-Za-z_$][\w$]{0,63}|<anonymous>)(?:\.(?:[A-Za-z_$][\w$]{0,63}|<anonymous>)){0,4}$/;
/** A file is a code path: no spaces, no query string. */
const FILE_SHAPE = /^[A-Za-z0-9_@./:\\-]{1,300}$/;
const FRAME = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/;
const MAX_FRAMES = 50;

function framesOf(error: unknown, secrets: SecretRegistry): Frame[] {
  const stack = error instanceof Error && typeof error.stack === "string" ? error.stack : "";
  const frames: Frame[] = [];
  for (const line of stack.split("\n")) {
    const match = FRAME.exec(line);
    if (!match || frames.length >= MAX_FRAMES) continue;
    const [, rawName, file, row, column] = match;
    const name = rawName?.replace(/^(?:async |new )+/, "");
    // Both strings are bounded shapes. Anything else is dropped, not forwarded, so a stack cannot carry free text.
    const kept = (value: string | undefined, shape: RegExp) => (value !== undefined && shape.test(value) && secrets.scrub(value) === value ? value : null);
    frames.push({ function: kept(name, FUNCTION_SHAPE), file: kept(file, FILE_SHAPE) ?? "unknown", line: Number(row), column: Number(column) });
  }
  return frames;
}

export function scrubError(error: unknown, context: ErrorContext | undefined, deployment: Deployment, secrets: SecretRegistry): ScrubbedEvent {
  const name = error instanceof Error ? error.constructor.name : "";
  const { fields } = admitFields(context);
  const tags: Record<string, string> = {};
  const clean = (value: string) => secrets.scrub(value);
  for (const key of ID_FIELDS) { const value = fields[key]; if (typeof value === "string") tags[key] = clean(value); }
  return {
    errorClass: CLASS_SHAPE.test(name) ? name : error instanceof Error ? "Error" : "NonError",
    code: typeof fields["code"] === "string" ? clean(fields["code"]) : null,
    frames: framesOf(error, secrets),
    release: deployment.release, role: deployment.role, environment: deployment.environment,
    tags,
  };
}
