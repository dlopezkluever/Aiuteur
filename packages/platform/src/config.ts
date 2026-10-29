import type { Environment } from "@aiuteur/contract";
import type { ProcessRole } from "@aiuteur/observability";

/**
 * Deployment configuration, read once at the composition root from the host's environment values and passed down
 * (build rule R24). A host secret file holds the values per environment; this module only parses them. A problem names
 * the variable, never its value.
 */
export interface RuntimeConfig {
  readonly environment: Environment;
  readonly role: ProcessRole;
  /** `sha256:` and 64 hex digits: the image this process runs, as the deploy script recorded it. */
  readonly release: string;
  readonly port: number;
  readonly origin: string;
  /** Header the trusted edge sets to the caller's address, or null to use the socket address. */
  readonly clientAddressHeader: string | null;
  readonly databases: { readonly app: string; readonly identity: string; readonly scheduler: string };
  readonly authSecret: string;
  readonly operatorEmails: readonly string[];
  readonly smtp: { readonly host: string; readonly port: number; readonly from: string; readonly security: "tls" | "starttls" | "none"; readonly auth?: { user: string; pass: string } };
  /** R2 object storage (RUNTIME-PLATFORM §0). Validated here; the BlobStore adapter that uses it belongs to the media tickets. */
  readonly r2: { readonly endpoint: string; readonly bucket: string; readonly accessKeyId: string; readonly secretAccessKey: string };
  readonly errorSinkDsn: string;
  /** The external heartbeat's ping URL, which the worker requests after every healthy tick. */
  readonly heartbeatUrl: string | null;
  /** Every value that must never appear in a log line or an error event. */
  readonly secretValues: readonly string[];
}

export class ConfigInvalid extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) { super(`invalid configuration: ${problems.join("; ")}`); this.name = "ConfigInvalid"; this.problems = problems; }
}

type Env = Readonly<Record<string, string | undefined>>;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
/** The owner DSN exists only in the pipeline's migration step (OPERATIONAL-BASELINE §5). */
const FORBIDDEN_IN_PROCESS = ["MIGRATION_DATABASE_URL", "OWNER_DATABASE_URL"];

export function readConfig(env: Env, role: ProcessRole): RuntimeConfig {
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
  const integer = (name: string, fallback?: number): number => {
    const raw = optional(name);
    if (raw === undefined) { if (fallback === undefined) problems.push(`${name} is required`); return fallback ?? 0; }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 65_535) problems.push(`${name} must be a port number`);
    return value;
  };

  // R24: the deployment declares its environment; this root serves staging only. Production's root is a later ticket.
  if (env["AIUTEUR_ENVIRONMENT"] !== "staging") problems.push("AIUTEUR_ENVIRONMENT must be staging");
  for (const name of FORBIDDEN_IN_PROCESS) if (env[name] !== undefined) problems.push(`${name} must not be present in a running process`);
  const release = text("RELEASE_DIGEST");
  if (release !== "" && !DIGEST.test(release)) problems.push("RELEASE_DIGEST must be sha256: and 64 hex digits");

  const databases = { app: url("DATABASE_URL_APP", ["postgres:", "postgresql:"]), identity: url("DATABASE_URL_IDENTITY", ["postgres:", "postgresql:"]), scheduler: url("DATABASE_URL_SCHEDULER", ["postgres:", "postgresql:"]) };
  const authSecret = text("AUTH_SECRET");
  if (authSecret !== "" && authSecret.length < 32) problems.push("AUTH_SECRET must be at least 32 characters");
  const origin = url("PUBLIC_ORIGIN", ["https:"]);
  const security = optional("SMTP_SECURITY") ?? "starttls";
  if (security !== "tls" && security !== "starttls" && security !== "none") problems.push("SMTP_SECURITY must be tls, starttls or none");
  const smtpUser = optional("SMTP_USER");
  const smtpPass = optional("SMTP_PASS");
  if ((smtpUser === undefined) !== (smtpPass === undefined)) problems.push("SMTP_USER and SMTP_PASS are set together");
  const r2Account = text("R2_ACCOUNT_ID");
  if (r2Account !== "" && !/^[0-9a-f]{32}$/.test(r2Account)) problems.push("R2_ACCOUNT_ID must be 32 hex digits");
  const r2 = { endpoint: `https://${r2Account}.r2.cloudflarestorage.com`, bucket: text("R2_BUCKET"), accessKeyId: text("R2_ACCESS_KEY_ID"), secretAccessKey: text("R2_SECRET_ACCESS_KEY") };
  const errorSinkDsn = url("ERROR_SINK_DSN", ["https:"]);
  const heartbeatUrl = role === "worker" ? url("HEARTBEAT_PING_URL", ["https:"]) : (optional("HEARTBEAT_PING_URL") ?? null);
  const header = optional("CLIENT_ADDRESS_HEADER")?.toLowerCase() ?? null;
  if (header !== null && !/^[a-z][a-z0-9-]*$/.test(header)) problems.push("CLIENT_ADDRESS_HEADER must be a header name");
  const port = integer("PORT", 8080);
  const smtpPort = integer("SMTP_PORT", security === "tls" ? 465 : 587);
  const smtpHost = text("SMTP_HOST");
  const smtpFrom = text("SMTP_FROM");
  const operatorEmails = (optional("OPERATOR_EMAILS") ?? "").split(",").map((email) => email.trim()).filter(Boolean);
  if (problems.length > 0) throw new ConfigInvalid(problems);

  return {
    environment: "staging", role, release, port, origin, clientAddressHeader: header, databases, authSecret, operatorEmails,
    smtp: { host: smtpHost, port: smtpPort, from: smtpFrom, security: security as "tls" | "starttls" | "none", ...(smtpUser !== undefined && smtpPass !== undefined ? { auth: { user: smtpUser, pass: smtpPass } } : {}) },
    r2, errorSinkDsn, heartbeatUrl,
    secretValues: [authSecret, smtpPass, r2.accessKeyId, r2.secretAccessKey, errorSinkDsn, heartbeatUrl ?? undefined, ...Object.values(databases)].filter((value): value is string => value !== undefined && value !== ""),
  };
}
