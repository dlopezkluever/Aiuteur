// VC2 golden Rendered requests (VERIFICATION-AND-OBSERVABILITY §4; GENERATION-PACKAGE §13.2).
// A golden holds the ResolvedInputs and profile content it was compiled from, the full Rendered
// request, the Package layers, the Fit report, the digest and the versions, plus a history of
// (code versions → digest). The code that makes the bytes (compiler, scaffold, dialect) is judged
// by recompiling the *recorded* inputs and profile: if those bytes differ while the code versions
// are unchanged, the change is refused, whatever else changed in the fixture at the same time.
// After a bump, or a fixture change that the recorded replay shows to be the only cause,
// `--update` rewrites the golden and the diff is reviewed as text.
//
//   node packages/compiler/test/golden.ts --update
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { canonicalJson, sha256, snapshotProfile, type ProfileContent } from "@aiuteur/providers";
import { compile, type CompileResult, type ResolvedInputs } from "@aiuteur/compiler";
import { FAKE_TEXT_PROFILE_CONTENT } from "@aiuteur/testing";

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
export const GP_S_PROFILE: ProfileContent = FAKE_TEXT_PROFILE_CONTENT;

export const GOLDEN_FILE = fileURLToPath(new URL("./golden/treatment-draft.json", import.meta.url));

type Fitted = Extract<CompileResult, { result: "fitted" }>;
export interface Golden {
  readonly case: string;
  readonly inputs: ResolvedInputs;
  readonly profile: ProfileContent;
  readonly versions: Fitted["versions"];
  readonly digest: string;
  readonly package: unknown;
  readonly fit: unknown;
  readonly renderedRequest: unknown;
  readonly history: readonly { readonly versions: string; readonly digest: string }[];
}

/** The versions of the code that turns inputs and a profile into bytes. The profile snapshot is input, not code. */
export const codeKey = (v: Fitted["versions"]) => `compiler@${v.compiler} scaffold:${v.scaffold.operation}@${v.scaffold.version} dialect:${v.dialect.id}@${v.dialect.version}`;
export const versionKey = (v: Fitted["versions"]) => `${codeKey(v)} profile:${v.profileSnapshotId}`;

/** The golden a compile would write. */
export function goldenOf(inputs: ResolvedInputs, profile: ProfileContent, result: CompileResult, history: Golden["history"]): Golden {
  if (result.result !== "fitted") throw new Error("the golden case must fit");
  return { case: "GP-S: pasted paragraph → Draft Treatment preview", inputs, profile, versions: result.versions, digest: result.digest, package: result.package, fit: result.fit, renderedRequest: result.renderedRequest, history };
}

export type Verdict = "match" | "unbumped-change" | "stale" | "history-conflict";

/** The bytes of a compile, without its history. */
const bytes = (g: Golden) => canonicalJson({ ...g, history: [] });

/**
 * `replay`: today's code on the golden's recorded inputs and profile. `actual`: today's code on today's fixture.
 * `unbumped-change`: the replay's bytes differ from the golden while its code versions are the golden's.
 * `stale`: the change is explained by a code version bump, or by a fixture change alone; regenerate and review.
 */
export function judge(golden: Golden, replay: Golden, actual: Golden): Verdict {
  const keys = golden.history.map((h) => h.versions);
  if (new Set(keys).size !== keys.length) return "history-conflict";
  if (!golden.history.some((h) => h.versions === versionKey(golden.versions) && h.digest === golden.digest)) return "history-conflict";
  const recordedSameCode = golden.history.filter((h) => h.versions.startsWith(`${codeKey(replay.versions)} profile:`));
  if (bytes(replay) !== bytes(golden)) {
    if (codeKey(replay.versions) === codeKey(golden.versions) || recordedSameCode.length > 0) return "unbumped-change";
  }
  if (bytes(actual) === bytes(golden)) return "match";
  const recorded = golden.history.find((h) => h.versions === versionKey(actual.versions));
  if (recorded && recorded.digest !== actual.digest) return "unbumped-change";
  return "stale";
}

export const readGolden = (): Golden => JSON.parse(readFileSync(GOLDEN_FILE, "utf8")) as Golden;

/** Today's code over the recorded fixture and over today's fixture. */
export function compileBoth(golden: Golden) {
  const replay = goldenOf(golden.inputs, golden.profile, compile(golden.inputs, snapshotProfile(golden.profile)), golden.history);
  const actual = goldenOf(GP_S_TREATMENT_INPUTS, GP_S_PROFILE, compile(GP_S_TREATMENT_INPUTS, snapshotProfile(GP_S_PROFILE)), golden.history);
  return { replay, actual };
}

if (process.argv.includes("--update")) {
  let existing: Golden | null = null;
  try { existing = readGolden(); } catch { existing = null; }
  const history = existing?.history ?? [];
  const actual = goldenOf(GP_S_TREATMENT_INPUTS, GP_S_PROFILE, compile(GP_S_TREATMENT_INPUTS, snapshotProfile(GP_S_PROFILE)), history);
  const verdict = existing ? (() => { const both = compileBoth(existing); return judge(existing, both.replay, both.actual); })() : "stale";
  if (verdict === "unbumped-change" || verdict === "history-conflict") {
    console.error(`refused (${verdict}): the Rendered request changed without a compiler, scaffold or dialect version change`);
    process.exit(1);
  }
  if (verdict === "stale") {
    const seen = history.some((h) => h.versions === versionKey(actual.versions));
    const next = { ...actual, history: seen ? history : [...history, { versions: versionKey(actual.versions), digest: actual.digest }] };
    writeFileSync(GOLDEN_FILE, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`golden written for ${versionKey(actual.versions)}; review the diff as text`);
  } else console.log("golden matches");
}
