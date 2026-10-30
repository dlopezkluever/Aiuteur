import { blockDocumentSchema, type GenerationId, type Verdict } from "@aiuteur/contract";

// The AI-map guards (AI-RESPONSIBILITY-MAP §3) as pure functions of (proposal, snapshot, state) -> Verdict, testable
// without a model (MODULE §3.1; build rule R4: this package imports only `contract`, with no IO, clock or randomness).
// The model only proposes; these decide what may be committed. T0-06 owns G1, G2, G3, G4 and G7 for Treatment drafting.

type Failure = Extract<Verdict, { pass: false } | { pass: "held" }>;
const reject = (guard: Failure["guard"], reason: string): Verdict => ({ pass: false, guard, reason });
const hold = (guard: Failure["guard"], reason: string): Verdict => ({ pass: "held", guard, reason });

/** One passage per blank-line-separated block of the response; surrounding whitespace is not content. */
export const passages = (response: string) => response.split(/\r?\n[ \t]*(?:\r?\n[ \t]*)+/).map((p) => p.trim()).filter((p) => p.length > 0);

const OPEN: ReadonlyMap<string, string> = new Map([["\u201c", "\u201d"], ["\"", "\""], ["\u00ab", "\u00bb"], ["\u300c", "\u300d"], ["\u2018", "\u2019"], ["'", "'"]]);
const SINGLE = new Set(["\u2018", "\u2019", "'"]);
const wordChar = /[\p{L}\p{N}]/u;

/**
 * The verbatim-constrained segments of the creator's source: each quoted span, delimiters included, in source order. The
 * source is the creator's own text, so it is scanned; the model's output never is. A single quote inside a word is an
 * apostrophe, not a delimiter.
 */
export function dialogueSegments(source: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < source.length;) {
    const close = OPEN.get(source[i]!);
    if (close === undefined || (SINGLE.has(source[i]!) && wordChar.test(source[i - 1] ?? ""))) { i++; continue; }
    let end = -1;
    for (let j = i + 1; j < source.length; j++) {
      if (source[j] === close && !(SINGLE.has(close) && wordChar.test(source[j + 1] ?? ""))) { end = j; break; }
    }
    if (end === -1) { i++; continue; }
    out.push(source.slice(i, end + 1));
    i = end + 1;
  }
  return out;
}

export interface Checked {
  readonly verdict: Verdict;
  /** The proposal, only when every guard passed. */
  readonly passages: string[] | null;
  /** What G1 could parse, even when a later guard refused it: kept for a HELD result, never committed as clean. */
  readonly retained: string[] | null;
}

/** G1 Schema: the response is well-formed text with at least one passage. (A cut-off response is a failure of the transport, never accepted.) */
export function g1Schema(response: string): Checked {
  if (response.includes("\u0000") || !response.isWellFormed()) return { verdict: reject("G1", "not-well-formed-text"), passages: null, retained: null };
  const found = passages(response);
  if (found.length === 0) return { verdict: reject("G1", "empty"), passages: null, retained: null };
  return { verdict: { pass: true, guards: ["G1"] }, passages: found, retained: found };
}

/** G2 Reference integrity: the Treatment compiles no handles, so a handle-like token in the response cannot resolve in the input snapshot. */
export function g2References(found: readonly string[]): Verdict {
  return found.some((p) => /\[D\d+\]/.test(p)) ? reject("G2", "unresolved-handle") : { pass: true, guards: ["G2"] };
}

const occurrences = (text: string, part: string) => text.split(part).length - 1;

/**
 * G3 Verbatim: each verbatim-constrained segment of the source (a quoted line, delimiters included) appears byte-equal in the
 * result, in the same order and the same count (AI-map §3). The result is never scanned for quotation marks, so changing the
 * quotation style, altering a line or dropping it all fail the same way: the source segment is not there.
 */
export function g3Verbatim(found: readonly string[], source: string): Verdict {
  const result = found.join("\n\n");
  const segments = dialogueSegments(source);
  let from = 0;
  for (const segment of segments) {
    const at = result.indexOf(segment, from);
    if (at === -1) return reject("G3", result.includes(segment) ? "dialogue-out-of-order" : "dialogue-not-verbatim");
    from = at + segment.length;
  }
  for (const segment of new Set(segments)) {
    if (occurrences(result, segment) !== occurrences(source, segment)) return reject("G3", "dialogue-count");
  }
  return { pass: true, guards: ["G3"] };
}

/** G1 to G3 over the raw response, with the first failure reported. */
export function checkTreatment(response: string, source: string): Checked {
  const schema = g1Schema(response);
  if (schema.passages === null) return schema;
  for (const verdict of [g2References(schema.passages), g3Verbatim(schema.passages, source)]) if (!verdict.pass) return { verdict, passages: null, retained: schema.passages };
  return { verdict: { pass: true, guards: ["G1", "G2", "G3"] }, passages: schema.passages, retained: schema.passages };
}

/** What a base unit was when the Generation read it, and what it is when the result arrives. */
export interface BaseState { readonly sequence: number; readonly fingerprint: string }

/**
 * G4 Splice: a new Option is committed as the whole proposal over an empty base, so the splice holds by construction; what
 * can fail is the base. If the base unit's content changed while the call ran, the result is HELD, never applied (AI-map §5).
 * A newer Revision with the same content fingerprint did not change what the model read.
 */
export function g4Splice(captured: BaseState, current: BaseState | null): Verdict {
  return current !== null && current.fingerprint === captured.fingerprint ? { pass: true, guards: ["G4"] } : hold("G4", "base-changed");
}

/**
 * G7 Provenance and record: the commit path refuses AI-made content that does not name its Generation. Provenance is
 * computed by code from the plan; nothing the model said about itself is read. Every run of every block must be
 * `ai_generated` by this Generation.
 */
export function g7Provenance(body: unknown, generationId: GenerationId): Verdict {
  const parsed = blockDocumentSchema.safeParse(body);
  if (!parsed.success) return reject("G7", "not-a-block-document");
  for (const block of parsed.data.blocks) for (const runs of Object.values(block.fields)) for (const run of runs) {
    if (run.provenance !== "ai_generated" || run.generation !== generationId) return reject("G7", "provenance-not-this-generation");
  }
  return { pass: true, guards: ["G7"] };
}

/** Joins the guards that passed: the final verdict of a proposal that cleared every guard. */
export function passed(...verdicts: readonly Verdict[]): Verdict {
  return { pass: true, guards: verdicts.flatMap((v) => (v.pass === true ? v.guards : [])) };
}
