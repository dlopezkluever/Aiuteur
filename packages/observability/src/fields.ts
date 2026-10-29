import type { Environment } from "@aiuteur/contract";

/** OPERATIONAL-BASELINE §4.1: the two process roles of the one image. */
export const PROCESS_ROLES = ["web", "worker"] as const;
export type ProcessRole = (typeof PROCESS_ROLES)[number];

/** The tier A id fields (VERIFICATION-AND-OBSERVABILITY §2.3). Values are opaque ids, never text. */
export const ID_FIELDS = ["accountId", "projectId", "jobId", "generationId", "requestId", "actionId"] as const;
export type IdField = (typeof ID_FIELDS)[number];
/** An id is a short token of id characters. A sentence, a URL or a key with punctuation cannot pass as one. */
const ID_SHAPE = /^[0-9A-Za-z_-]{1,64}$/;
/** A closed code is a lowercase slug (`rate-limited`). */
const CODE_SHAPE = /^[a-z][a-z0-9-]{0,63}$/;

export type IdFields = { readonly [K in IdField]?: string };
/** The whole typed field set. There is no free-text member (OPERATIONAL-BASELINE §6). */
export interface LogFields extends IdFields {
  readonly code?: string;
  readonly durationMs?: number;
  readonly count?: number;
}

/** What every line and every error event carries, fixed at boot. */
export interface Deployment {
  readonly environment: Environment;
  readonly role: ProcessRole;
  /** The image digest the process runs (`sha256:` and 64 hex digits), so every line and event names its release. */
  readonly release: string;
}

const isId = (value: unknown): value is string => typeof value === "string" && ID_SHAPE.test(value);
const isCode = (value: unknown): value is string => typeof value === "string" && CODE_SHAPE.test(value);
const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * Deny by default at runtime as well as in the type: a key outside the field set, or a value of the wrong shape, is
 * dropped and counted, never written. This is the guard for callers that bypass the type.
 */
export function admitFields(input: unknown): { fields: Record<string, string | number>; dropped: number } {
  const fields: Record<string, string | number> = {};
  let dropped = 0;
  if (typeof input !== "object" || input === null) return { fields, dropped };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const ok = (ID_FIELDS as readonly string[]).includes(key) ? isId(value)
      : key === "code" ? isCode(value)
      : key === "durationMs" || key === "count" ? isCount(value)
      : false;
    if (ok) fields[key] = value as string | number; else dropped++;
  }
  return { fields, dropped };
}
