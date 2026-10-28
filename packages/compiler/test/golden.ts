// VC2 golden Rendered requests (VERIFICATION-AND-OBSERVABILITY §4; GENERATION-PACKAGE §13.2).
// A golden holds the full Rendered request, the Package layers, the Fit report, the digest
// and the versions that made them, plus a history of (versions → digest). A changed byte
// under unchanged versions is refused, by the test and by `--update`; after a bump, `--update`
// rewrites the golden and appends to the history, and the diff is reviewed as text.
//
//   node packages/compiler/test/golden.ts --update
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { canonicalJson, sha256 } from "@aiuteur/providers";
import { compile, type CompileResult, type ResolvedInputs } from "@aiuteur/compiler";
import { FAKE_TEXT_PROFILE } from "@aiuteur/testing";

const SOURCE_TEXT =
  "Mara runs the night ferry between two islands that no longer speak to each other. One winter a passenger boards " +
  "with no ticket and a letter addressed to both mayors. \u201cDeliver it,\u201d he says, \u201cor nobody crosses again.\u201d\n";

/** The first GP-S-shaped ResolvedInputs: a pasted paragraph, Revision 1, no Writing Style. */
export const GP_S_TREATMENT_INPUTS: ResolvedInputs = {
  operation: "treatment.draft",
  sourceMaterial: {
    text: SOURCE_TEXT,
    captured: { unit: "content", objectId: "019a2b3c-4d5e-7f60-8a1b-2c3d4e5f6a7b", sequence: 1, fingerprint: sha256(canonicalJson(SOURCE_TEXT)) },
  },
  writingStyle: null,
};

export const GOLDEN_FILE = fileURLToPath(new URL("./golden/treatment-draft.json", import.meta.url));

export interface Golden {
  readonly case: string;
  readonly versions: Extract<CompileResult, { result: "fitted" }>["versions"];
  readonly digest: string;
  readonly package: unknown;
  readonly fit: unknown;
  readonly renderedRequest: unknown;
  readonly history: readonly { readonly versions: string; readonly digest: string }[];
}

export const versionKey = (v: Golden["versions"]) => `compiler@${v.compiler} scaffold:${v.scaffold.operation}@${v.scaffold.version} dialect:${v.dialect.id}@${v.dialect.version} profile:${v.profileSnapshotId}`;

export function goldenOf(result: CompileResult, history: Golden["history"]): Golden {
  if (result.result !== "fitted") throw new Error("the golden case must fit");
  return { case: "GP-S: pasted paragraph → Draft Treatment preview", versions: result.versions, digest: result.digest, package: result.package, fit: result.fit, renderedRequest: result.renderedRequest, history };
}

export type Verdict = "match" | "unbumped-change" | "stale" | "history-conflict";

/** `unbumped-change`: bytes differ under the recorded versions. `stale`: versions were bumped; regenerate and review. */
export function judge(golden: Golden, actual: Golden): Verdict {
  const keys = golden.history.map((h) => h.versions);
  if (new Set(keys).size !== keys.length) return "history-conflict";
  if (!golden.history.some((h) => h.versions === versionKey(golden.versions) && h.digest === golden.digest)) return "history-conflict";
  const recorded = golden.history.find((h) => h.versions === versionKey(actual.versions));
  if (canonicalJson(actual) === canonicalJson({ ...golden, history: actual.history })) return "match";
  if (recorded || versionKey(actual.versions) === versionKey(golden.versions)) return "unbumped-change";
  return "stale";
}

export const readGolden = (): Golden => JSON.parse(readFileSync(GOLDEN_FILE, "utf8")) as Golden;

if (process.argv.includes("--update")) {
  let existing: Golden | null = null;
  try { existing = readGolden(); } catch { existing = null; }
  const history = existing?.history ?? [];
  const actual = goldenOf(compile(GP_S_TREATMENT_INPUTS, FAKE_TEXT_PROFILE), history);
  const verdict = existing ? judge(existing, actual) : "stale";
  if (verdict === "unbumped-change" || verdict === "history-conflict") {
    console.error(`refused (${verdict}): the Rendered request changed without a compiler, scaffold, dialect or profile version change`);
    process.exit(1);
  }
  if (verdict === "stale") {
    const next = { ...actual, history: [...history, { versions: versionKey(actual.versions), digest: actual.digest }] };
    writeFileSync(GOLDEN_FILE, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`golden written for ${versionKey(actual.versions)}; review the diff as text`);
  } else console.log("golden matches");
}
