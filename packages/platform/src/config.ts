import type { Environment } from "@aiuteur/contract";
import type { ProcessRole } from "@aiuteur/observability";

/**
 * Deployment configuration, read once at the composition root from the host's environment values and passed down
 * (build rule R24). Each process role has its own host secret file and its own parser: a role is refused a variable that
 * belongs to another role, so one compromised process never holds the other's secrets (RUNTIME-PLATFORM §5, OPERATIONAL-BASELINE §5).
 * A problem names the variable, never its value.
 */
interface Common {
  readonly environment: Environment;
  /** `sha256:` and 64 hex digits: the image this process runs, as the deploy script recorded it. */
  readonly release: string;
  readonly errorSinkDsn: string;
  /** The `scheduler` identity: web uses it for the fast-path claim and the liveness read, the worker for its tick. */
  readonly schedulerUrl: string;
}
export interface WebConfig extends Common {
  readonly role: "web";
  readonly port: number;
  readonly origin: string;
  /** Header the trusted edge sets to the caller's address, or null to use the socket address. */
  readonly clientAddressHeader: string | null;
  readonly databases: { readonly app: string; readonly identity: string; readonly scheduler: string };
  readonly authSecret: string;
  readonly operatorEmails: readonly string[];
  readonly smtp: { readonly host: string; readonly port: number; readonly from: string; readonly security: "tls" | "starttls" | "none"; readonly auth?: { user: string; pass: string } };
  /** `/healthz/deep` is red when the worker's last tick is older than this (no default: the operator chooses). */
  readonly workerStaleAfterMs: number;
  /** `/healthz/deep` is red when the oldest overdue due time is older than this (RUNTIME-PLATFORM §7). */
  readonly overdueAfterMs: number;
  /** R2 object storage (RUNTIME-PLATFORM §1): `web` signs uploads and views and promotes staged bytes (`media`). */
  readonly r2: { readonly endpoint: string; readonly bucket: string; readonly accessKeyId: string; readonly secretAccessKey: string };
  readonly secretValues: readonly string[];
}
export interface WorkerConfig extends Common {
  readonly role: "worker";
  /** The external heartbeat's ping URL, which the worker requests after every healthy tick. */
  readonly heartbeatUrl: string;
  readonly secretValues: readonly string[];
}
export type RuntimeConfig = WebConfig | WorkerConfig;

export class ConfigInvalid extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) { super(`invalid configuration: ${problems.join("; ")}`); this.name = "ConfigInvalid"; this.problems = problems; }
}

type Env = Readonly<Record<string, string | undefined>>;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
/** Present in no running process, whatever its role: the owner DSN and the role passwords exist only in the migration step; the Postgres password only in the database container; the smoke login only in the smoke. */
const NEVER_IN_A_PROCESS = [/^MIGRATION_DATABASE_URL$/, /^OWNER_DATABASE_URL$/, /^POSTGRES_/, /^ROLE_PASSWORD_/, /^SMOKE_/];
const WEB_ONLY = [/^R2_/, /^AUTH_SECRET$/, /^SMTP_/, /^DATABASE_URL_APP$/, /^DATABASE_URL_IDENTITY$/, /^OPERATOR_EMAILS$/, /^PUBLIC_ORIGIN$/, /^WORKER_STALE_AFTER_MS$/, /^OVERDUE_AFTER_MS$/, /^CLIENT_ADDRESS_HEADER$/];
const WORKER_ONLY = [/^HEARTBEAT_/];

function reader(env: Env, role: ProcessRole) {
  const problems: string[] = [];
  const text = (name: string): string => {
    const value = env[name];
    if (value === undefined || value.trim() === "") { problems.push(`${name} is required`); return ""; }
    return value.trim();
  };
  const optional = (name: string) => (env[name]?.trim() ? env[name]!.trim() : undefined);
  const url = (name: string, protocols: readonly string[]): string => {
    const value = text(name);
    if (value !== "") { try { if (!protocols.includes(new URL(value).protocol)) problems.push(`${name} must use ${protocols.join(" or ")}`); } catch { problems.push(`${name} must be a URL`); } }
    return value;
  };
  /** A runtime database URL names exactly the least-privilege role it is for. A superuser, or another role, is refused before any connection. */
  const database = (name: string, expected: "app" | "identity" | "scheduler"): string => {
    const value = url(name, ["postgres:", "postgresql:"]);
    if (value !== "") { try { if (decodeURIComponent(new URL(value).username) !== expected) problems.push(`${name} must connect as the ${expected} role`); } catch { /* reported as not a URL */ } }
    return value;
  };
  const integer = (name: string, min: number, max: number, fallback?: number): number => {
    const raw = optional(name);
    if (raw === undefined) { if (fallback === undefined) problems.push(`${name} is required`); return fallback ?? 0; }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) problems.push(`${name} must be an integer from ${min} to ${max}`);
    return value;
  };
  // R24: the deployment declares its environment; this root serves staging only. Production's root is a later ticket.
  if (env["AIUTEUR_ENVIRONMENT"] !== "staging") problems.push("AIUTEUR_ENVIRONMENT must be staging");
  const foreign = role === "web" ? WORKER_ONLY : WEB_ONLY;
  for (const name of Object.keys(env)) {
    if (env[name] === undefined) continue;
    if ([...NEVER_IN_A_PROCESS, ...foreign].some((pattern) => pattern.test(name))) problems.push(`${name} must not be present in the ${role} process`);
  }
  const release = text("RELEASE_DIGEST");
  if (release !== "" && !DIGEST.test(release)) problems.push("RELEASE_DIGEST must be sha256: and 64 hex digits");
  return { problems, text, optional, url, database, integer, release };
}

export function readWebConfig(env: Env): WebConfig {
  const r = reader(env, "web");
  const databases = { app: r.database("DATABASE_URL_APP", "app"), identity: r.database("DATABASE_URL_IDENTITY", "identity"), scheduler: r.database("DATABASE_URL_SCHEDULER", "scheduler") };
  const authSecret = r.text("AUTH_SECRET");
  if (authSecret !== "" && authSecret.length < 32) r.problems.push("AUTH_SECRET must be at least 32 characters");
  const origin = r.url("PUBLIC_ORIGIN", ["https:"]);
  const security = r.optional("SMTP_SECURITY") ?? "starttls";
  if (security !== "tls" && security !== "starttls" && security !== "none") r.problems.push("SMTP_SECURITY must be tls, starttls or none");
  const smtpUser = r.optional("SMTP_USER");
  const smtpPass = r.optional("SMTP_PASS");
  if ((smtpUser === undefined) !== (smtpPass === undefined)) r.problems.push("SMTP_USER and SMTP_PASS are set together");
  const r2Account = r.text("R2_ACCOUNT_ID");
  if (r2Account !== "" && !/^[0-9a-f]{32}$/.test(r2Account)) r.problems.push("R2_ACCOUNT_ID must be 32 hex digits");
  const r2 = { endpoint: `https://${r2Account}.r2.cloudflarestorage.com`, bucket: r.text("R2_BUCKET"), accessKeyId: r.text("R2_ACCESS_KEY_ID"), secretAccessKey: r.text("R2_SECRET_ACCESS_KEY") };
  const errorSinkDsn = r.url("ERROR_SINK_DSN", ["https:"]);
  const header = r.optional("CLIENT_ADDRESS_HEADER")?.toLowerCase() ?? null;
  if (header !== null && !/^[a-z][a-z0-9-]*$/.test(header)) r.problems.push("CLIENT_ADDRESS_HEADER must be a header name");
  const port = r.integer("PORT", 0, 65_535, 8080);
  const smtpPort = r.integer("SMTP_PORT", 1, 65_535, security === "tls" ? 465 : 587);
  const smtpHost = r.text("SMTP_HOST");
  const smtpFrom = r.text("SMTP_FROM");
  const workerStaleAfterMs = r.integer("WORKER_STALE_AFTER_MS", 1, 86_400_000);
  const overdueAfterMs = r.integer("OVERDUE_AFTER_MS", 1, 86_400_000);
  const operatorEmails = (r.optional("OPERATOR_EMAILS") ?? "").split(",").map((email) => email.trim()).filter(Boolean);
  if (r.problems.length > 0) throw new ConfigInvalid(r.problems);
  return {
    environment: "staging", role: "web", release: r.release, port, origin, clientAddressHeader: header, databases, schedulerUrl: databases.scheduler, authSecret, operatorEmails,
    smtp: { host: smtpHost, port: smtpPort, from: smtpFrom, security: security as "tls" | "starttls" | "none", ...(smtpUser !== undefined && smtpPass !== undefined ? { auth: { user: smtpUser, pass: smtpPass } } : {}) },
    errorSinkDsn, r2, workerStaleAfterMs, overdueAfterMs,
    secretValues: [authSecret, smtpPass, r2.accessKeyId, r2.secretAccessKey, errorSinkDsn, ...Object.values(databases)].filter((value): value is string => value !== undefined && value !== ""),
  };
}

export function readWorkerConfig(env: Env): WorkerConfig {
  const r = reader(env, "worker");
  const schedulerUrl = r.database("DATABASE_URL_SCHEDULER", "scheduler");
  const errorSinkDsn = r.url("ERROR_SINK_DSN", ["https:"]);
  const heartbeatUrl = r.url("HEARTBEAT_PING_URL", ["https:"]);
  if (r.problems.length > 0) throw new ConfigInvalid(r.problems);
  return {
    environment: "staging", role: "worker", release: r.release, schedulerUrl, errorSinkDsn, heartbeatUrl,
    secretValues: [errorSinkDsn, heartbeatUrl, schedulerUrl].filter((value) => value !== ""),
  };
}
