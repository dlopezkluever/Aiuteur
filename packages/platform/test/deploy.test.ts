import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

// deploy/deploy.sh against a stub `docker` that records every call and models what is RUNNING (the `running` file). This
// proves the mechanism (digest only, no build, previous-image smoke before the swap, rollback of known releases only, state and
// evidence that follow reality); the live run proves the host.
const ROOT = join(import.meta.dirname, "../../..");
const SCRIPT = join(ROOT, "deploy/deploy.sh");
const A = `sha256:${"a".repeat(64)}`;
const B = `sha256:${"b".repeat(64)}`;
const C = `sha256:${"c".repeat(64)}`;
const REPO = "registry.example/aiuteur";

const STUB = `#!/usr/bin/env bash
dir=$(dirname "$STUB_LOG")
echo "\${IMAGE_REF:-}|$*|web=\${WEB_ENV_FILE:-} worker=\${WORKER_ENV_FILE:-} postgres=\${POSTGRES_ENV_FILE:-}" >> "$STUB_LOG"
running=$(cat "$dir/running" 2>/dev/null || true)
case "$1" in
  image) echo "\${@: -1}" ;;
  exec)
    if [[ "$*" == *aiuteur-compat* ]]; then [[ -n "\${STUB_FAIL_COMPAT:-}" ]] && exit 1; exit 0; fi
    [[ -n "\${STUB_FAIL_SMOKE_FOR:-}" && "$running" == *"$STUB_FAIL_SMOKE_FOR" ]] && exit 1
    exit 0 ;;
  inspect) echo "$running" ;;
  compose)
    if [[ "$*" == *" up "* && "$*" == *"--remove-orphans"* ]]; then
      [[ -n "\${STUB_FAIL_UP_FOR:-}" && "\${IMAGE_REF:-}" == *"$STUB_FAIL_UP_FOR" ]] && exit 1
      echo "$IMAGE_REF" > "$dir/running"
    fi
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
    env: { PATH: process.env["PATH"] ?? "", DOCKER: join(dir, "docker"), AIUTEUR_HOME: join(dir, "home"), ENV_DIR: join(dir, "etc"), IMAGE_REPOSITORY: REPO, SMOKE_ATTEMPTS: "1", STUB_LOG: join(dir, "calls.log"), ...extra },
  });
  return { status: result.status, out: result.stdout + result.stderr };
}
const calls = () => (existsSync(join(dir, "calls.log")) ? readFileSync(join(dir, "calls.log"), "utf8").trim().split("\n") : []);
const state = (name: string) => (existsSync(join(dir, "home/state", name)) ? readFileSync(join(dir, "home/state", name), "utf8").trim() : null);
const running = () => (existsSync(join(dir, "running")) ? readFileSync(join(dir, "running"), "utf8").trim() : null);
const history = () => readFileSync(join(dir, "home/state/history.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, string>);
const swaps = () => calls().filter((c) => c.includes("--remove-orphans") && c.includes(" up ")).map((c) => c.split("|")[0]);
const ref = (digest: string) => `${REPO}@${digest}`;

describe("deploy and rollback by digest", () => {
  it("refuses anything that is not a digest before it touches docker", () => {
    for (const bad of ["latest", "v1.2.3", "abc1234", `sha256:${"a".repeat(63)}`, `sha256:${"A".repeat(64)}`, `${A}; rm -rf /`]) {
      expect(run(["deploy", bad]).status, bad).not.toBe(0);
    }
    expect(calls()).toEqual([]);
    expect(run(["rollback", "latest"]).status).not.toBe(0);
    expect(calls()).toEqual([]);
  });

  it("first deploy: pulls the digest, migrates under the owner env only, swaps, records it, builds nothing", () => {
    const result = run(["deploy", A]);
    expect(result.status).toBe(0);
    const log = calls();
    expect(log[0]).toMatch(new RegExp(`^\\|pull ${ref(A)}\\|`));
    const migrate = log.filter((c) => c.includes("migrate.ts"));
    expect(migrate).toHaveLength(1);
    expect(migrate[0]).toContain(`--env-file ${join(dir, "etc/owner.env")}`);
    expect(log.some((c) => c.includes("aiuteur-compat"))).toBe(false);
    expect(swaps().at(-1)).toBe(ref(A));
    expect(log.some((c) => /\b(build|tag|push)\b/.test(c.split("|")[1] ?? ""))).toBe(false);
    expect(state("current")).toBe(A);
    expect(state("deployed")).toBe(A);
    expect(running()).toBe(ref(A));
    expect(history()).toEqual([expect.objectContaining({ action: "deploy", result: "succeeded", attempted: A, deployed: A, restored: "", running: A })]);
  });

  it("long-running services get only their own env files; the owner and smoke files reach no service", () => {
    run(["deploy", A]);
    run(["deploy", B]);
    const owner = join(dir, "etc/owner.env");
    const smoke = join(dir, "etc/smoke.env");
    for (const call of calls().filter((c) => c.includes("|compose "))) {
      expect(call).toContain(`web=${join(dir, "etc/web.env")} worker=${join(dir, "etc/worker.env")} postgres=${join(dir, "etc/postgres.env")}`);
      expect(call).not.toContain(owner);
      expect(call).not.toContain(smoke);
    }
    // The owner file is given to exactly one short-lived container per deploy, the migration; the compat container (a web) gets web.env.
    expect(calls().filter((c) => c.includes(owner))).toHaveLength(2);
    expect(calls().filter((c) => c.includes(owner)).every((c) => c.includes("|run --rm ") && c.includes("migrate.ts"))).toBe(true);
    const compat = calls().find((c) => c.includes("|run -d --name aiuteur-compat"))!;
    expect(compat).toContain(`--env-file ${join(dir, "etc/web.env")}`);
    expect(compat).not.toContain(owner);
  });

  it("second deploy: the PREVIOUS image's smoke runs on the new schema before the swap, then both digests are recorded", () => {
    run(["deploy", A]);
    const mark = calls().length;
    const result = run(["deploy", B]);
    expect(result.status).toBe(0);
    const log = calls().slice(mark);
    const migrate = log.findIndex((c) => c.includes(`${ref(B)} node packages/store/scripts/migrate.ts`));
    const compatStart = log.findIndex((c) => c.includes("--name aiuteur-compat") && c.includes(`${ref(A)} node packages/platform/scripts/web.ts`));
    const compatSmoke = log.findIndex((c) => c.includes("exec --env-file") && c.includes("aiuteur-compat node packages/platform/scripts/smoke.ts"));
    const swap = log.findIndex((c) => c.startsWith(`${ref(B)}|`) && c.includes("--remove-orphans"));
    expect([migrate, compatStart, compatSmoke, swap].every((i) => i >= 0)).toBe(true);
    expect(migrate).toBeLessThan(compatStart);
    expect(compatStart).toBeLessThan(compatSmoke);
    expect(compatSmoke).toBeLessThan(swap);
    expect(state("current")).toBe(B);
    expect(state("previous")).toBe(A);
    expect(state("deployed")).toBe(`${A}\n${B}`);
    expect(result.out).toContain(`previous-image compatibility smoke passed: ${A}`);
  });

  it("a previous image that fails on the new schema stops the deploy before anything is swapped", () => {
    run(["deploy", A]);
    const result = run(["deploy", B], { STUB_FAIL_COMPAT: "1" });
    expect(result.status).not.toBe(0);
    expect(swaps()).toEqual([ref(A)]);
    expect(running()).toBe(ref(A));
    expect(state("current")).toBe(A);
    expect(history().at(-1)).toMatchObject({ action: "deploy", result: "compatibility-failed", attempted: B, deployed: "", running: A });
  });

  it("new image fails its smoke and the automatic restore SUCCEEDS: reality, state and evidence all say the prior digest", () => {
    run(["deploy", A]);
    const result = run(["deploy", B], { STUB_FAIL_SMOKE_FOR: B });
    expect(result.status).not.toBe(0);
    expect(running()).toBe(ref(A));
    expect(state("current")).toBe(A);
    expect(state("deployed")).toBe(A);
    expect(history().slice(-2)).toEqual([
      expect.objectContaining({ action: "auto-rollback", result: "restored", restored: A, replaced: B, running: A }),
      expect.objectContaining({ action: "deploy", result: "smoke-failed", attempted: B, deployed: "", running: A }),
    ]);
  });

  it("new image fails its smoke and the automatic restore FAILS: state is unknown, evidence restores nothing, and a deploy is refused", () => {
    run(["deploy", A]);
    const result = run(["deploy", B], { STUB_FAIL_SMOKE_FOR: B, STUB_FAIL_UP_FOR: A });
    expect(result.status).not.toBe(0);
    expect(running()).toBe(ref(B)); // reality: the failed image is still what runs
    expect(state("current")).toBe("unknown"); // ...and the state does not claim otherwise
    expect(state("attempted")).toBe(B);
    const evidence = history().slice(-2);
    expect(evidence).toEqual([
      expect.objectContaining({ action: "auto-rollback", result: "restore-failed", restored: "", running: "unknown" }),
      expect.objectContaining({ action: "deploy", result: "smoke-failed", deployed: "", restored: "", running: "unknown" }),
    ]);
    expect(history().some((e) => e["restored"] === A && e["running"] === A && e["action"] === "auto-rollback")).toBe(false);
    // No deploy is driven by the false belief that A runs.
    const mark = calls().length;
    const again = run(["deploy", C]);
    expect(again.status).not.toBe(0);
    expect(calls().length).toBe(mark);
    // A rollback to a known release confirms reality again.
    expect(run(["rollback", A]).status).toBe(0);
    expect(running()).toBe(ref(A));
    expect(state("current")).toBe(A);
    expect(state("previous")).toBeNull();
    expect(state("attempted")).toBeNull();
  });

  it("a first deploy that fails its smoke leaves the state unknown, not empty", () => {
    expect(run(["deploy", A], { STUB_FAIL_SMOKE_FOR: A }).status).not.toBe(0);
    expect(state("current")).toBe("unknown");
    expect(state("deployed")).toBeNull();
    expect(history().at(-1)).toMatchObject({ result: "smoke-failed", deployed: "", running: "unknown" });
  });

  it("rollback restores the recorded previous digest by pulling it: no migration, no build, no tag", () => {
    run(["deploy", A]);
    run(["deploy", B]);
    const mark = calls().length;
    const result = run(["rollback"]);
    expect(result.status).toBe(0);
    const log = calls().slice(mark);
    expect(log[0]).toMatch(new RegExp(`^\\|pull ${ref(A)}\\|`));
    expect(log.some((c) => c.includes("migrate.ts") || c.includes(owner()) || /\b(build|tag|push)\b/.test(c.split("|")[1] ?? ""))).toBe(false);
    expect(running()).toBe(ref(A));
    expect(state("current")).toBe(A);
    expect(state("previous")).toBe(B);
    expect(history().at(-1)).toMatchObject({ action: "rollback", result: "succeeded", restored: A, replaced: B, running: A });
    expect(result.out).toContain(`"restored":"${A}"`);
  });

  it("rollback to a digest this host never deployed is refused before any docker call; a malformed one too", () => {
    run(["deploy", A]);
    run(["deploy", B]);
    const mark = calls().length;
    const never = run(["rollback", C]);
    expect(never.status).not.toBe(0);
    expect(never.out).toContain("never deployed");
    expect(run(["rollback", "sha256:short"]).status).not.toBe(0);
    expect(calls().length).toBe(mark);
    expect([state("current"), state("previous"), running()]).toEqual([B, A, ref(B)]);
    expect(history().map((e) => e["action"])).toEqual(["deploy", "deploy"]);
    // A deployed digest, named explicitly, is accepted.
    expect(run(["rollback", A]).status).toBe(0);
    expect(state("current")).toBe(A);
  });

  it("a failed digest never becomes a rollback target, and with nothing recorded a rollback asks for a digest", () => {
    expect(run(["rollback"]).status).not.toBe(0);
    run(["deploy", A]);
    run(["deploy", B], { STUB_FAIL_SMOKE_FOR: B });
    expect(run(["rollback", B]).status).not.toBe(0);
    expect(state("deployed")).toBe(A);
  });

  it("smoke-account migrates, then creates the smoke Account with the web and smoke env files only; it takes a digest and changes no release state", () => {
    expect(run(["smoke-account", "latest"]).status).not.toBe(0);
    expect(calls()).toEqual([]);
    expect(run(["smoke-account", A]).status).toBe(0);
    const log = calls();
    const migrate = log.findIndex((c) => c.includes("migrate.ts"));
    const create = log.findIndex((c) => c.includes("smoke-account.ts"));
    expect(migrate).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(migrate);
    expect(log[create]).toContain(`--env-file ${join(dir, "etc/web.env")} --env-file ${join(dir, "etc/smoke.env")}`);
    expect(log[create]).not.toContain(owner());
    expect([state("current"), state("deployed")]).toEqual([null, null]);
  });

  it("is idempotent: deploying the running digest again changes no recorded state", () => {
    run(["deploy", A]);
    run(["deploy", B]);
    expect(run(["deploy", B]).status).toBe(0);
    expect([state("current"), state("previous"), state("deployed")]).toEqual([B, A, `${A}\n${B}`]);
  });
});

function owner() { return join(dir, "etc/owner.env"); }

describe("the staging shape", () => {
  const compose = readFileSync(join(ROOT, "deploy/compose.staging.yml"), "utf8").split("\n").filter((line) => !line.trimStart().startsWith("#")).join("\n");
  const service = (name: string) => compose.split(/^  (?=\w+:$)/m).find((block) => block.startsWith(`${name}:`)) ?? "";

  it("pins nothing but IMAGE_REF for web and worker, and builds nothing", () => {
    expect(compose.match(/image: \$\{IMAGE_REF/g)).toHaveLength(2);
    expect(compose).not.toMatch(/:latest|build:/);
  });

  it("has no trust path to Postgres, and gives each service its own secret file only", () => {
    expect(compose).not.toMatch(/trust|POSTGRES_HOST_AUTH_METHOD/);
    expect(service("postgres")).toContain("env_file: ${POSTGRES_ENV_FILE");
    expect(service("web")).toContain("env_file: ${WEB_ENV_FILE");
    expect(service("worker")).toContain("env_file: ${WORKER_ENV_FILE");
    expect(service("edge")).not.toContain("env_file");
    expect(compose).not.toMatch(/owner|smoke|MIGRATION_DATABASE_URL/i);
    expect(service("postgres")).not.toContain("ports:");
  });

  it("the example files keep service secrets service-specific and name only non-superuser roles", () => {
    const text = (name: string) => readFileSync(join(ROOT, "deploy/env", `${name}.env.example`), "utf8");
    const names = (name: string) => text(name).split("\n").filter((line) => /^[A-Z_0-9]+=/.test(line)).map((line) => line.split("=")[0]!);
    expect(names("web")).not.toContainEqual(expect.stringMatching(/^(HEARTBEAT_|POSTGRES_|ROLE_PASSWORD_|MIGRATION_|SMOKE_)/));
    expect(names("worker")).not.toContainEqual(expect.stringMatching(/^(R2_|AUTH_SECRET|SMTP_|DATABASE_URL_APP|DATABASE_URL_IDENTITY|POSTGRES_|ROLE_PASSWORD_|MIGRATION_|SMOKE_)/));
    expect(names("worker")).toContain("DATABASE_URL_SCHEDULER");
    for (const name of ["web", "worker"]) for (const line of text(name).split("\n").filter((l) => l.startsWith("DATABASE_URL_"))) expect(line).toMatch(/\/\/(app|identity|scheduler):/);
    expect(names("owner")).toEqual(["MIGRATION_DATABASE_URL", "ROLE_PASSWORD_APP", "ROLE_PASSWORD_IDENTITY", "ROLE_PASSWORD_SCHEDULER"]);
    expect(names("postgres")).toEqual(["POSTGRES_PASSWORD"]);
  });
});
