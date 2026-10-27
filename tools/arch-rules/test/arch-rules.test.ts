import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkWorkspace, collectWorkspaceSources, type Violation } from "@aiuteur/arch-rules";
import { createWorkspace, repoRoot, type Workspace } from "./workspace.ts";

describe("the repository", () => {
  it("passes R19 and R20", () => {
    const sources = collectWorkspaceSources(repoRoot);
    expect(sources).toContain("packages/testing/src/fake-transport.ts");
    expect(sources).toContain("vitest.config.ts");
    expect(sources.some((p) => p.includes("node_modules/") || p.startsWith("."))).toBe(false);
    expect(checkWorkspace(repoRoot)).toStrictEqual([]);
  });

  it("replaces no module through the Vitest configuration", async () => {
    const configs = collectWorkspaceSources(repoRoot).filter((p) => /(^|\/)(vite|vitest)\.(config|workspace)\./.test(p));
    expect(configs).toStrictEqual(["vitest.config.ts"]);
    const { default: config } = await import(join(repoRoot, "vitest.config.ts"));
    expect(config.resolve?.alias).toBeUndefined();
    expect(config.test?.alias).toBeUndefined();
    expect(config.plugins).toBeUndefined();
    expect(config.test?.setupFiles).toBeUndefined();
    expect(config.test?.globals).toBeUndefined();
  });
});

// Each fixture is a file the checker must fail (with the rules listed) or must pass ([]).
// Every fixture typechecks under the repository's strict TypeScript, so each failing one
// is a real bypass of a check that relies on types or spelling alone.
const MOCKED = `const providers = (await import("@aiuteur/providers")) as unknown as { sentinel?: string };\n  expect(providers.sentinel).toBe("mocked");`;
const replaces = (setup: string, imports = `import { expect, it, vi } from "vitest";`) =>
  `${imports}\nit("replaces a repository module", async () => {\n  ${setup}\n  ${MOCKED}\n});\n`;
const FACTORY = `() => ({ sentinel: "mocked" })`;

/** Module-mocking routes that Vitest really executes; the execution proof runs each one. */
const MOCKING_ROUTES: Record<string, string> = {
  "mock-direct.test.ts": replaces(`vi.doMock("@aiuteur/providers", ${FACTORY});`),
  "mock-aliased-import.test.ts": replaces(`verifier.doMock("@aiuteur/providers", ${FACTORY});`, `import { expect, it, vi as verifier } from "vitest";`),
  "mock-vitest-export.test.ts": replaces(`vitest.doMock("@aiuteur/providers", ${FACTORY});`, `import { expect, it, vitest } from "vitest";`),
  "mock-namespace-import.test.ts": replaces(`v.vi.doMock("@aiuteur/providers", ${FACTORY});`, `import { expect, it } from "vitest";\nimport * as v from "vitest";`),
  "mock-computed-literal.test.ts": replaces(`vi["doMock"]("@aiuteur/providers", ${FACTORY});`),
  "mock-computed-constant.test.ts": replaces(`const how = "doMock";\n  vi[how]("@aiuteur/providers", ${FACTORY});`),
  "mock-destructured.test.ts": replaces(`const { doMock } = vi;\n  doMock("@aiuteur/providers", ${FACTORY});`),
  "mock-destructured-renamed.test.ts": replaces(`const { doMock: replace } = vi;\n  replace("@aiuteur/providers", ${FACTORY});`),
  "mock-function-value.test.ts": replaces(`const replace = vi.doMock;\n  replace("@aiuteur/providers", ${FACTORY});`),
  "mock-call.test.ts": replaces(`(vi.doMock as (path: string, factory: () => unknown) => void).call(vi, "@aiuteur/providers", ${FACTORY});`),
  "mock-reflect.test.ts": replaces(`const replace = Reflect.get(vi, "doMock");\n  replace("@aiuteur/providers", ${FACTORY});`),
  "mock-hoisted.test.ts": `import { expect, it, vi } from "vitest";\nvi.mock("@aiuteur/providers", ${FACTORY});\nit("replaces a repository module", async () => {\n  ${MOCKED}\n});\n`,
};

const TRANSPORT_PARTS = `import type { ProviderTransport as PT, RealAdapter } from "@aiuteur/providers";
declare const part: { [K in keyof RealAdapter]: RealAdapter[K] };
declare const fakePart: { [K in keyof PT<"fake">]: PT<"fake">[K] };`;
const members = (type: string) =>
  ["profile", "submit", "observe", "cancel", "lookup", "fetch", "billedQuantity", "wireCapture"]
    .map((m) => `declare ${m}: ${type}["${m}"];`)
    .join("\n  ");
const DECLARED_MEMBERS = members("PT");
const FAKE_ARGS = `{ profile: FAKE_VIDEO_PROFILE, clock: new ManualClock(), webhookSecret: "s" }`;

interface Fixture {
  readonly text: string;
  readonly rules: readonly Violation["rule"][];
  /** Fragments some violation message must contain, naming the check that must catch it. */
  readonly says?: readonly string[];
}

const FIXTURES: Record<string, Fixture> = {
  // R20: every route to a module-mocking API fails.
  ...Object.fromEntries(Object.entries(MOCKING_ROUTES).map(([name, text]) => [`packages/providers/test/${name}`, { text, rules: ["R20"] } satisfies Fixture])),
  "packages/providers/test/r20-unmock.test.ts": { text: `import { vi } from "vitest";\nvi.unmock("@aiuteur/providers");\nvi.doUnmock("@aiuteur/providers");\n`, rules: ["R20"] },
  "packages/providers/test/r20-import-actual.test.ts": { text: `import { vi } from "vitest";\nexport const real = vi.importActual("@aiuteur/providers");\nexport const fake = vi.importMock("@aiuteur/providers");\n`, rules: ["R20"] },
  "packages/providers/test/r20-spy.test.ts": { text: `import { vi } from "vitest";\nimport * as providers from "@aiuteur/providers";\nvi.spyOn(providers, "classifyProviderError");\n`, rules: ["R20"] },
  "packages/providers/test/r20-escaped-object.test.ts": { text: `import { vi } from "vitest";\ndeclare const key: string;\nexport const anything = (vi as unknown as Record<string, unknown>)[key];\n`, rules: ["R20"], says: ["passed where the checker cannot follow it"] },
  "packages/providers/test/r20-asserted-key.test.ts": { text: `import { vi } from "vitest";\ndeclare const key: string;\nexport const looksHarmless = vi[key as "fn"];\n`, rules: ["R20"], says: ["non-literal key"] },
  "packages/providers/test/r20-rest.test.ts": { text: `import { vi } from "vitest";\nconst { fn, ...rest } = vi;\nexport { fn, rest };\n`, rules: ["R20"], says: ["rest destructuring"] },
  "packages/providers/test/r20-node-test.test.ts": { text: `import { mock } from "node:test";\nmock.module("@aiuteur/providers", {});\n`, rules: ["R20"] },
  "packages/providers/test/r20-jest.test.ts": { text: `declare const jest: { mock(path: string): void };\njest.mock("@aiuteur/providers");\n`, rules: ["R20"] },
  "packages/providers/test/plain-doubles.test.ts": {
    text: `import { expect, it, vi } from "vitest";\nconst v = vi;\nit("uses function doubles", () => {\n  const f = v.fn();\n  vi.useFakeTimers();\n  expect(f).not.toHaveBeenCalled();\n  vi.useRealTimers();\n});\n`,
    rules: [],
  },

  // R19: a non-test module may not reach testing/ under any name.
  "packages/providers/src/leak-package.ts": { text: `import { FakeTransport } from "@aiuteur/testing";\nexport const leaked = FakeTransport;\n`, rules: ["R19"] },
  "packages/providers/src/leak-type-only.ts": { text: `import type { FakeControl } from "@aiuteur/testing";\nexport type Leaked = FakeControl;\n`, rules: ["R19"] },
  "packages/providers/src/leak-reexport.ts": { text: `export * from "@aiuteur/testing";\n`, rules: ["R19"] },
  "packages/providers/src/leak-dynamic.ts": { text: `export const leaked = await import("@aiuteur/testing");\n`, rules: ["R19"], says: ["reaches test-side packages/testing/src/index.ts"] },
  "packages/providers/src/leak-dynamic-expression.ts": { text: `const name = ["@aiuteur", "testing"].join("/");\nexport const leaked: unknown = await import(name);\n`, rules: ["R19"], says: ["not a string literal"] },
  "packages/providers/src/leak-import-type.ts": { text: `export type Leaked = typeof import("@aiuteur/testing");\n`, rules: ["R19"], says: ["reaches test-side packages/testing/src/index.ts"] },
  "packages/providers/src/leak-relative.ts": { text: `import { FakeTransport } from "../../testing/src/fake-transport.ts";\nexport const leaked = FakeTransport;\n`, rules: ["R19"], says: ["reaches test-side packages/testing/src/fake-transport.ts"] },
  "packages/providers/src/leak-package-imports.ts": { text: `import { FakeTransport } from "#testing";\nexport const leaked = FakeTransport;\n`, rules: ["R19"], says: ["testing/src/index.ts through \"#testing\""] },
  "packages/providers/src/leak-runtime-condition.ts": { text: `import * as runtimeDouble from "#runtime-double";\nexport const leaked: unknown = runtimeDouble;\n`, rules: ["R19"], says: ["testing/src/index.ts through \"#runtime-double\""] },
  "packages/providers/src/leak-workspace-alias.ts": { text: `import { FakeTransport } from "tst";\nexport const leaked = FakeTransport;\n`, rules: ["R19"], says: ["testing/src/index.ts through \"tst\""] },
  "packages/providers/src/leak-tsconfig-paths.ts": { text: `import { FakeTransport } from "@double/fake-transport.ts";\nexport const leaked = FakeTransport;\n`, rules: ["R19"], says: ["testing/src/fake-transport.ts through \"@double/fake-transport.ts\""] },
  "packages/providers/src/leak-require.ts": { text: `import { createRequire } from "node:module";\nconst load = createRequire(import.meta.url);\nexport const leaked: unknown = load("@aiuteur/testing");\n`, rules: ["R19"], says: ["reaches test-side packages/testing/src/index.ts"] },
  "packages/providers/src/leak-through-test-helper.ts": { text: `import { helper } from "../test/helper.ts";\nexport const leaked = helper;\n`, rules: ["R19"], says: ["reaches test-side packages/providers/test/helper.ts"] },
  "packages/providers/test/helper.ts": { text: `export { FakeTransport as helper } from "@aiuteur/testing";\n`, rules: [] },
  "packages/providers/src/.hidden/leak.ts": { text: `export * from "@aiuteur/testing";\n`, rules: ["R19"] },
  "packages/providers/src/leak-javascript.mjs": { text: `export * from "@aiuteur/testing";\n`, rules: ["R19"] },
  "apps/server/src/composition/production.ts": { text: `import { FakeTransport } from "@aiuteur/testing";\nexport const transport = FakeTransport;\n`, rules: ["R19"] },
  "apps/server/src/composition/ci.ts": { text: `import { FakeTransport } from "@aiuteur/testing";\nexport const transport = FakeTransport;\n`, rules: [] },
  "packages/providers/test/uses-fake.test.ts": {
    text: `import type { FakeAdapter } from "@aiuteur/providers";\nimport { FAKE_VIDEO_PROFILE, FakeTransport, ManualClock } from "#testing";\nexport const fake: FakeAdapter = new FakeTransport(${FAKE_ARGS});\n`,
    rules: [],
  },
  "packages/generation/src/consumer.ts": {
    text: `import type { RealAdapter } from "@aiuteur/providers";\nexport function kindOf(transport: RealAdapter): string {\n  return transport.kind;\n}\n`,
    rules: [],
  },

  // R19: fakes and transports by structure, under any name.
  "packages/providers/test/misplaced-fake.test.ts": { text: `import { FakeTransport as FT } from "../../testing/src/index.ts";\nexport class MisplacedFake extends FT {}\n`, rules: ["R19"], says: ["class MisplacedFake is a provider fake"] },
  "packages/providers/src/misplaced-fake.ts": { text: `import { FakeTransport as FT } from "../../testing/src/index.ts";\nexport class MisplacedFake extends FT {}\n`, rules: ["R19"], says: ["class MisplacedFake is a provider fake", "reaches test-side"] },
  "packages/providers/test/fake-through-variable.test.ts": { text: `import { FakeTransport } from "@aiuteur/testing";\nconst Base = FakeTransport;\nexport class Sneaky extends Base {}\n`, rules: ["R19"], says: ["class Sneaky is a provider fake"] },
  "packages/providers/test/fake-anonymous.test.ts": { text: `import { FakeTransport } from "@aiuteur/testing";\nexport const Sneaky = class extends FakeTransport {};\n`, rules: ["R19"], says: ["class (anonymous) is a provider fake"] },
  "packages/providers/test/structural-double.test.ts": { text: `${TRANSPORT_PARTS}\nexport const double = { ...fakePart };\n`, rules: ["R19"], says: ["fake-kind ProviderTransport that does not extend FakeTransport"] },
  "packages/generation/src/aliased-implements.ts": { text: `${TRANSPORT_PARTS}\nexport class Shortcut implements PT {\n  declare kind: "real";\n  ${DECLARED_MEMBERS}\n}\n`, rules: ["R19"], says: ["implements ProviderTransport outside", "class Shortcut is a ProviderTransport implementation"] },
  "packages/generation/src/structural-class.ts": { text: `${TRANSPORT_PARTS}\nexport class Shortcut {\n  declare kind: "real";\n  ${DECLARED_MEMBERS}\n}\n`, rules: ["R19"], says: ["class Shortcut is a ProviderTransport implementation"] },
  "packages/generation/src/structural-literal.ts": { text: `${TRANSPORT_PARTS}\nexport const shortcut = { ...part };\n`, rules: ["R19"], says: ["object literal is a ProviderTransport implementation"] },
  "packages/generation/src/assertion.ts": { text: `import type { RealAdapter } from "@aiuteur/providers";\nexport const shortcut = {} as unknown as RealAdapter;\n`, rules: ["R19"], says: ["asserts a value to a ProviderTransport type"] },
  "packages/generation/src/untyped.ts": { text: `import type { RealAdapter } from "@aiuteur/providers";\ndeclare const loose: any;\ndeclare function dispatch(transport: RealAdapter): void;\ndispatch(loose);\n`, rules: ["R19"], says: ["untyped (any) value"] },
  "packages/testing/src/rogue-fake.ts": { text: `${TRANSPORT_PARTS}\nexport class Rogue {\n  declare kind: "fake";\n  ${members('PT<"fake">')}\n}\n`, rules: ["R19"], says: ["class Rogue is a fake-kind ProviderTransport"] },
  "packages/providers/src/adapters/acme/transport.ts": { text: `${TRANSPORT_PARTS}\nexport class AcmeTransport implements RealAdapter {\n  declare kind: "real";\n  ${members("RealAdapter")}\n}\nexport const literal = { ...part };\n`, rules: [] },
  "packages/providers/src/adapters/acme/fake.ts": { text: `import { FakeTransport } from "@aiuteur/testing";\nexport class AcmeFake extends FakeTransport {}\n`, rules: ["R19"], says: ["class AcmeFake is a provider fake"] },
  "packages/testing/src/audio-fake.ts": { text: `import { FakeTransport } from "./fake-transport.ts";\nexport class AudioFake extends FakeTransport {}\n`, rules: [] },
};

describe("R19 and R20 fail on meaning, not spelling", () => {
  let workspace: Workspace;
  let violations: Violation[];
  beforeAll(() => {
    workspace = createWorkspace();
    for (const [path, { text }] of Object.entries(FIXTURES)) workspace.write(path, text);
    violations = checkWorkspace(workspace.root);
  }, 60_000);
  afterAll(() => workspace?.dispose());

  it("every fixture is valid strict TypeScript", () => {
    const tsc = spawnSync(join(repoRoot, "node_modules/.bin/tsc"), ["--noEmit", "-p", join(workspace.root, "tsconfig.json")]);
    expect({ status: tsc.status, output: tsc.stdout.toString() }).toStrictEqual({ status: 0, output: "" });
  }, 60_000);

  it("Node resolves the package-imports and workspace aliases to testing/", () => {
    const specifiers = ["#testing", "#runtime-double", "tst"];
    const resolved = execFileSync(process.execPath, ["--input-type=module", "-e", `console.log(${specifiers.map((s) => `import.meta.resolve("${s}")`).join(", ")})`], {
      cwd: join(workspace.root, "packages/providers"),
    }).toString();
    expect(resolved.trim().split(" ")).toStrictEqual(specifiers.map(() => `file://${workspace.root}/packages/testing/src/index.ts`));
  });

  it("Vitest really replaces a repository module on every mocking route", () => {
    const outputFile = join(workspace.root, "mocking-routes.json");
    spawnSync(
      process.execPath,
      [join(repoRoot, "node_modules/vitest/vitest.mjs"), "run", "--root", workspace.root, "--reporter", "json", "--outputFile", outputFile, "packages/providers/test/mock-"],
      { stdio: "ignore" },
    );
    const report = JSON.parse(readFileSync(outputFile, "utf8")) as { testResults: { name: string; status: string }[] };
    const passed = report.testResults.filter((r) => r.status === "passed").map((r) => r.name.split("/").at(-1)).sort();
    expect(passed).toStrictEqual(Object.keys(MOCKING_ROUTES).sort());
  }, 60_000);

  it.each(Object.entries(FIXTURES))("%s", (path, { rules, says = [] }) => {
    const mine = violations.filter((v) => v.path === path);
    expect([...new Set(mine.map((v) => v.rule))].sort(), JSON.stringify(mine)).toStrictEqual([...rules].sort());
    for (const fragment of says) expect(mine.map((v) => v.message), fragment).toContainEqual(expect.stringContaining(fragment));
  });

  it("names the R20 check that caught each mocking route", () => {
    const by = (name: string) => violations.filter((v) => v.path === `packages/providers/test/${name}`).map((v) => v.message);
    expect(by("mock-aliased-import.test.ts")).toContainEqual(expect.stringContaining("verifier.doMock"));
    expect(by("mock-computed-literal.test.ts")).toContainEqual(expect.stringContaining('vi["doMock"]'));
    expect(by("mock-computed-constant.test.ts")).toContainEqual(expect.stringContaining("non-literal key"));
    expect(by("mock-destructured.test.ts")).toContainEqual(expect.stringContaining("destructured doMock"));
    expect(by("mock-destructured-renamed.test.ts")).toContainEqual(expect.stringContaining("destructured doMock"));
    expect(by("mock-function-value.test.ts")).toContainEqual(expect.stringContaining("vi.doMock"));
    expect(by("mock-reflect.test.ts")).toContainEqual(expect.stringContaining("passed where the checker cannot follow it"));
    expect(by("mock-namespace-import.test.ts")).toContainEqual(expect.stringContaining("v.vi.doMock"));
    expect(by("mock-vitest-export.test.ts")).toContainEqual(expect.stringContaining("vitest.doMock"));
  });

  it("finds nothing in the copied real packages", () => {
    const fixturePaths = new Set(Object.keys(FIXTURES));
    expect(violations.filter((v) => !fixturePaths.has(v.path))).toStrictEqual([]);
  });

  it("scans nested dot-directories but no dependency", () => {
    const sources = collectWorkspaceSources(workspace.root);
    expect(sources).toContain("packages/providers/src/.hidden/leak.ts");
    expect(readdirSync(join(workspace.root, "node_modules")).length).toBeGreaterThan(0);
    expect(sources.some((p) => p.startsWith("node_modules/"))).toBe(false);
  });
});
