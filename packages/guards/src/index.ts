import { blockDocumentSchema, type GenerationId, type Verdict } from "@aiuteur/contract";

// The AI-map guards (AI-RESPONSIBILITY-MAP §3) as pure functions of (proposal, snapshot, state) -> Verdict, testable
// without a model (MODULE §3.1; build rule R4: this package imports only `contract`, with no IO, clock or randomness).
// The model only proposes; these decide what may be committed. T0-06 owns G1, G2, G3, G4 and G7 for Treatment drafting.

type Failure = Extract<Verdict, { pass: false } | { pass: "held" }>;
const reject = (guard: Failure["guard"], reason: string): Verdict => ({ pass: false, guard, reason });
const hold = (guard: Failure["guard"], reason: string): Verdict => ({ pass: "held", guard, reason });

/** One passage per blank-line-separated block of the response; surrounding whitespace is not content. */
export const passages = (response: string) => response.split(/\r?\n[ \t]*(?:\r?\n[ \t]*)+/).map((p) => p.trim()).filter((p) => p.length > 0);

/** Dialogue is the text inside a pair of double quotation marks, curly or straight, in the order it occurs. Exact; no fuzzy matching. */
export function dialogueOf(text: string): string[] {
  const found: { index: number; line: string }[] = [];
  for (const pattern of [/\u201c([^\u201d]*)\u201d/g, /"([^"]*)"/g]) for (const m of text.matchAll(pattern)) found.push({ index: m.index, line: m[1]! });
  return found.sort((a, b) => a.index - b.index).map((f) => f.line);
}

export interface Checked { readonly verdict: Verdict; readonly passages: string[] | null }

/** G1 Schema: the response is well-formed text with at least one passage. (A cut-off response is a failure of the transport, never accepted.) */
export function g1Schema(response: string): Checked {
  if (response.includes("\u0000") || !response.isWellFormed()) return { verdict: reject("G1", "not-well-formed-text"), passages: null };
  const found = passages(response);
  if (found.length === 0) return { verdict: reject("G1", "empty"), passages: null };
  return { verdict: { pass: true, guards: ["G1"] }, passages: found };
}

/** G2 Reference integrity: the Treatment compiles no handles, so a handle-like token in the response cannot resolve in the input snapshot. */
export function g2References(found: readonly string[]): Verdict {
  return found.some((p) => /\[D\d+\]/.test(p)) ? reject("G2", "unresolved-handle") : { pass: true, guards: ["G2"] };
}

/**
 * G3 Verbatim: every line of dialogue the response quotes is byte-equal to a whole dialogue line of the source, and the
 * quoted lines keep the source order. A Treatment may leave dialogue out; it may not alter, cut or reorder it.
 */
export function g3Verbatim(found: readonly string[], source: string): Verdict {
  const lines = dialogueOf(source);
  let from = 0;
  for (const line of found.flatMap(dialogueOf)) {
    const at = lines.indexOf(line, from);
    if (at === -1) return reject("G3", lines.includes(line) ? "dialogue-out-of-order" : "dialogue-altered");
    from = at;
  }
  return { pass: true, guards: ["G3"] };
}

/** G1 to G3 over the raw response, with the first failure reported. */
export function checkTreatment(response: string, source: string): Checked {
  const schema = g1Schema(response);
  if (schema.passages === null) return schema;
  for (const verdict of [g2References(schema.passages), g3Verbatim(schema.passages, source)]) if (!verdict.pass) return { verdict, passages: null };
  return { verdict: { pass: true, guards: ["G1", "G2", "G3"] }, passages: schema.passages };
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
