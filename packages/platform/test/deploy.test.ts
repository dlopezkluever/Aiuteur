import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

// deploy/deploy.sh against a stub `docker` that records every call and the IMAGE_REF it ran with. This proves the
// mechanism (digest only, no build, previous-image smoke before the swap, rollback by digest); the live run proves the host.
const SCRIPT = join(import.meta.dirname, "../../../deploy/deploy.sh");
const A = `sha256:${"a".repeat(64)}`;
const B = `sha256:${"b".repeat(64)}`;
const REPO = "registry.example/aiuteur";

const STUB = `#!/usr/bin/env bash
echo "\${IMAGE_REF:-}|$*" >> "$STUB_LOG"
case "$1" in
  image) echo "\${@: -1}" ;;
  exec) [[ "$*" == *aiuteur-compat* && -n "\${STUB_FAIL_COMPAT:-}" ]] && exit 1; exit 0 ;;
  inspect) echo "\${IMAGE_REF:-}" ;;
  compose)
    [[ "$*" == *" exec "* && -n "\${STUB_FAIL_SMOKE_FOR:-}" && "\${IMAGE_REF:-}" == *"$STUB_FAIL_SMOKE_FOR" ]] && exit 1
    [[ "$*" == *" ps "* ]] && echo container-id
    exit 0 ;;
esac
exit 0
`;

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "deploy-"));
  writeFileSync(join(dir, "docker"), STUB);
  chmodSync(join(dir, "docker"), 0o755);
});

function run(args: string[], extra: Record<string, string> = {}) {
  const result = spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    env: { PATH: process.env["PATH"] ?? "", DOCKER: join(dir, "docker"), AIUTEUR_HOME: dir, IMAGE_REPOSITORY: REPO, COMPAT_ATTEMPTS: "1", SMOKE_ATTEMPTS: "1", STUB_LOG: join(dir, "calls.log"), ...extra },
  });
  return { status: result.status, out: result.stdout + result.stderr };
}
const calls = () => (existsSync(join(dir, "calls.log")) ? readFileSync(join(dir, "calls.log"), "utf8").trim().split("\n") : []);
const state = (name: string) => (existsSync(join(dir, "state", name)) ? readFileSync(join(dir, "state", name), "utf8").trim() : null);
const history = () => readFileSync(join(dir, "state/history.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, string>);
const upsWithRef = () => calls().filter((c) => c.includes(" up ")).map((c) => c.split("|")[0]);

describe("deploy and rollback by digest", () => {
  it("refuses anything that is not a digest before it touches docker", () => {
    for (const bad of ["latest", "v1.2.3", "abc1234", `sha256:${"a".repeat(63)}`, `sha256:${"A".repeat(64)}`, `${A}; rm -rf /`]) {
      const result = run(["deploy", bad]);
      expect(result.status, bad).not.toBe(0);
    }
    expect(calls()).toEqual([]);
    expect(run(["rollback", "latest"]).status).not.toBe(0);
  });

  it("first deploy: pulls the digest, migrates under the owner env, swaps, records it, builds nothing", () => {
    const result = run(["deploy", A]);
    expect(result.status).toBe(0);
    const log = calls();
    expect(log[0]).toBe(`|pull ${REPO}@${A}`);
    expect(log.some((c) => c.startsWith("|run --rm") && c.includes("--env-file") && c.includes(`${REPO}@${A} node packages/store/scripts/migrate.ts`))).toBe(true);
    expect(log.some((c) => c.includes("aiuteur-compat"))).toBe(false); // no previous image yet
    expect(upsWithRef().at(-1)).toBe(`${REPO}@${A}`);
    expect(log.some((c) => /\b(build|tag|push)\b/.test(c.split("|")[1] ?? ""))).toBe(false);
    expect(state("current")).toBe(A);
    expect(history()).toEqual([expect.objectContaining({ action: "deploy", result: "succeeded", deployed: A, replaced: "" })]);
  });

  it("second deploy: runs the PREVIOUS image's smoke on the new schema before the swap, then records both digests", () => {
    run(["deploy", A]);
    const result = run(["deploy", B]);
    expect(result.status).toBe(0);
    const log = calls().slice(calls().findIndex((c) => c === `|pull ${REPO}@${B}`));
    const migrate = log.findIndex((c) => c.includes(`${REPO}@${B} node packages/store/scripts/migrate.ts`));
    const compatStart = log.findIndex((c) => c.includes(`--name aiuteur-compat`) && c.includes(`${REPO}@${A} node packages/platform/scripts/web.ts`));
    const compatSmoke = log.findIndex((c) => c.includes("exec aiuteur-compat node packages/platform/scripts/smoke.ts"));
    const swap = log.findIndex((c) => c.startsWith(`${REPO}@${B}|`) && c.includes("--remove-orphans"));
    expect([migrate, compatStart, compatSmoke, swap].every((i) => i >= 0)).toBe(true);
    expect(migrate).toBeLessThan(compatStart);
    expect(compatStart).toBeLessThan(compatSmoke);
    expect(compatSmoke).toBeLessThan(swap);
    expect(state("current")).toBe(B);
    expect(state("previous")).toBe(A);
    expect(result.out).toContain(`previous-image compatibility smoke passed: ${A}`);
  });

  it("a previous image that fails on the new schema stops the deploy before anything is swapped", () => {
    run(["deploy", A]);
    const result = run(["deploy", B], { STUB_FAIL_COMPAT: "1" });
    expect(result.status).not.toBe(0);
    expect(upsWithRef().includes(`${REPO}@${B}`)).toBe(true); // postgres came up to migrate...
    expect(calls().some((c) => c.startsWith(`${REPO}@${B}|`) && c.includes("--remove-orphans"))).toBe(false); // ...but web and worker never did
    expect(state("current")).toBe(A);
    expect(history().at(-1)).toMatchObject({ action: "deploy", result: "compatibility-failed", deployed: B, replaced: A });
  });

  it("a new image that fails its smoke after the swap is replaced by the prior digest, and the run fails", () => {
    run(["deploy", A]);
    const result = run(["deploy", B], { STUB_FAIL_SMOKE_FOR: B });
    expect(result.status).not.toBe(0);
    expect(upsWithRef().at(-1)).toBe(`${REPO}@${A}`);
    expect(state("current")).toBe(A);
    expect(history().slice(-2)).toEqual([
      expect.objectContaining({ action: "auto-rollback", result: "restored", restored: A, replaced: B }),
      expect.objectContaining({ action: "deploy", result: "smoke-failed", deployed: B }),
    ]);
  });

  it("rollback restores the previous digest by pulling it: no migration, no build, no tag", () => {
    run(["deploy", A]);
    run(["deploy", B]);
    const before = calls().length;
    const result = run(["rollback"]);
    expect(result.status).toBe(0);
    const log = calls().slice(before);
    expect(log[0]).toBe(`|pull ${REPO}@${A}`);
    expect(log.some((c) => c.includes("migrate.ts") || /\b(build|tag|push)\b/.test(c.split("|")[1] ?? ""))).toBe(false);
    expect(upsWithRef().at(-1)).toBe(`${REPO}@${A}`);
    expect(state("current")).toBe(A);
    expect(state("previous")).toBe(B);
    expect(history().at(-1)).toMatchObject({ action: "rollback", result: "succeeded", restored: A, replaced: B });
    expect(result.out).toContain(`"restored":"${A}"`);
  });

  it("rollback to an explicit digest works, and with nothing recorded it asks for one", () => {
    expect(run(["rollback"]).status).not.toBe(0);
    expect(run(["rollback", A]).status).toBe(0);
    expect(state("current")).toBe(A);
  });

  it("is idempotent: deploying the running digest again changes no recorded state", () => {
    run(["deploy", A]);
    run(["deploy", B]);
    expect(run(["deploy", B]).status).toBe(0);
    expect(state("current")).toBe(B);
    expect(state("previous")).toBe(A);
  });

  it("the shell is valid and the compose file pins nothing but IMAGE_REF", () => {
    execFileSync("bash", ["-n", SCRIPT]);
    const compose = readFileSync(join(import.meta.dirname, "../../../deploy/compose.staging.yml"), "utf8");
    expect(compose.match(/image: \$\{IMAGE_REF/g)).toHaveLength(2); // web and worker share the one digest
    expect(compose).not.toMatch(/:latest|build:/);
  });
});
