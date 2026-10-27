import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkWorkspace, collectWorkspaceSources, type Violation } from "@aiuteur/arch-rules";
import { createWorkspace, repoRoot, type Workspace } from "./workspace.ts";

it("the repository passes R19 and R20", () => {
  const sources = collectWorkspaceSources(repoRoot);
  expect(sources).toContain("packages/testing/src/fake-transport.ts");
  expect(sources.some((p) => p.includes("node_modules/") || p.startsWith("."))).toBe(false);
  expect(checkWorkspace(repoRoot)).toStrictEqual([]);
});

// The independent verifier's bypasses of `ef22362` (findings 1–3) and representative
// variants. Each fixture must fail with the listed rule, or pass ([]).
const replaces = (setup: string, imports = `import { expect, it, vi } from "vitest";`) =>
  `${imports}\nit("replaces a repository module", async () => {\n  ${setup}("@aiuteur/providers", () => ({ sentinel: "mocked" }));\n` +
  `  const providers = (await import("@aiuteur/providers")) as unknown as { sentinel?: string };\n  expect(providers.sentinel).toBe("mocked");\n});\n`;
const VERIFIER_MOCKING = {
  "packages/providers/test/mock-aliased-vi.test.ts": replaces("verifier.doMock", `import { expect, it, vi as verifier } from "vitest";`),
  "packages/providers/test/mock-computed.test.ts": replaces(`vi["doMock"]`),
};

const FIXTURES: Record<string, readonly Violation["rule"][]> = {
  // Finding 1: R20 under an alias or a statically known computed key.
  "packages/providers/test/mock-aliased-vi.test.ts": ["R20"],
  "packages/providers/test/mock-computed.test.ts": ["R20"],
  "packages/providers/test/mock-variants.test.ts": ["R20"],
  "packages/providers/test/mock-destructured.test.ts": ["R20"],
  "packages/providers/test/plain-doubles.test.ts": [],
  // Finding 2: a fake or transport outside its owner, under an alias.
  "packages/providers/test/misplaced-fake.test.ts": ["R19"],
  "packages/generation/src/aliased-implements.ts": ["R19"],
  "packages/providers/src/adapters/acme/transport.ts": [],
  "packages/testing/src/audio-fake.ts": [],
  "packages/generation/src/consumer.ts": [],
  // Finding 3: testing/ reached from non-test code under another name.
  "packages/providers/src/leak-package-imports.ts": ["R19"],
  "packages/providers/src/leak-workspace-alias.ts": ["R19"],
  "packages/providers/src/leak-tsconfig-paths.ts": ["R19"],
  "packages/providers/src/leak-relative.ts": ["R19"],
  "packages/providers/src/leak-forms.ts": ["R19"],
  "packages/providers/src/.hidden/leak.ts": ["R19"],
  "apps/server/src/composition/production.ts": ["R19"],
  "apps/server/src/composition/ci.ts": [],
  "packages/providers/test/uses-fake.test.ts": [],
};

const TEXTS: Record<string, string> = {
  ...VERIFIER_MOCKING,
  "packages/providers/test/mock-variants.test.ts": [
    `import * as v from "vitest";`,
    `import { vitest } from "vitest";`,
    `import { mock } from "node:test";`,
    `v.vi.doMock("@aiuteur/providers");`,
    `vitest.mock("@aiuteur/providers");`,
    `v.vi.spyOn(v, "it");`,
    "mock.module(`@aiuteur/providers`, {});",
  ].join("\n"),
  "packages/providers/test/mock-destructured.test.ts": `import { vi } from "vitest";\nconst { doMock: replace } = vi;\nreplace("@aiuteur/providers");\n`,
  "packages/providers/test/plain-doubles.test.ts": `import { expect, it, vi } from "vitest";\nit("uses a function double", () => {\n  expect(vi.fn()).not.toHaveBeenCalled();\n});\n`,
  "packages/providers/test/misplaced-fake.test.ts": `import { FakeTransport as FT } from "../../testing/src/index.ts";\nexport class MisplacedFake extends FT {}\n`,
  "packages/generation/src/aliased-implements.ts": `import type { ProviderTransport as PT } from "@aiuteur/providers";\nexport abstract class Shortcut implements PT {}\n`,
  "packages/providers/src/adapters/acme/transport.ts": `import type * as providers from "@aiuteur/providers";\nexport abstract class AcmeTransport implements providers.RealAdapter {}\n`,
  "packages/testing/src/audio-fake.ts": `import { FakeTransport } from "./fake-transport.ts";\nexport class AudioFake extends FakeTransport {}\n`,
  "packages/generation/src/consumer.ts": `import type { RealAdapter } from "@aiuteur/providers";\nexport const kindOf = (transport: RealAdapter) => transport.kind;\n`,
  "packages/providers/src/leak-package-imports.ts": `import { FakeTransport } from "#testing";\nexport class MisplacedFake extends FakeTransport {}\n`,
  "packages/providers/src/leak-workspace-alias.ts": `export { FakeTransport } from "tst";\n`,
  "packages/providers/src/leak-tsconfig-paths.ts": `import type { FakeControl } from "@double/fake-transport.ts";\nexport type Leaked = FakeControl;\n`,
  "packages/providers/src/leak-relative.ts": `import { FakeTransport } from "../../testing/src/fake-transport.ts";\nexport const leaked = FakeTransport;\n`,
  "packages/providers/src/leak-forms.ts": `export * from "@aiuteur/testing";\nexport const lazy = () => import("@aiuteur/testing");\n`,
  "packages/providers/src/.hidden/leak.ts": `export * from "@aiuteur/testing";\n`,
  "apps/server/src/composition/production.ts": `import { FakeTransport } from "@aiuteur/testing";\nexport const transport = FakeTransport;\n`,
  "apps/server/src/composition/ci.ts": `import { FakeTransport } from "@aiuteur/testing";\nexport const transport = FakeTransport;\n`,
  "packages/providers/test/uses-fake.test.ts": `import { FakeTransport } from "#testing";\nexport const fake = FakeTransport;\n`,
};

describe("R19 and R20 judge bindings and resolved imports, not spelling", () => {
  let workspace: Workspace;
  let violations: Violation[];
  beforeAll(() => {
    workspace = createWorkspace();
    for (const [path, text] of Object.entries(TEXTS)) workspace.write(path, text);
    violations = checkWorkspace(workspace.root);
  });
  afterAll(() => workspace?.dispose());

  it.each(Object.entries(FIXTURES))("%s", (path, rules) => {
    const mine = violations.filter((v) => v.path === path);
    expect([...new Set(mine.map((v) => v.rule))], JSON.stringify(mine)).toStrictEqual(rules);
  });

  it("flags every mocking call and import form in the variant files", () => {
    const lines = (path: string) => violations.filter((v) => v.path === path).map((v) => v.line);
    expect(lines("packages/providers/test/mock-variants.test.ts")).toStrictEqual([4, 5, 6, 7]);
    expect(lines("packages/providers/src/leak-forms.ts")).toStrictEqual([1, 2]);
    expect(violations.filter((v) => !(v.path in FIXTURES))).toStrictEqual([]);
  });

  it("the package-imports and workspace aliases really reach testing/ at runtime", () => {
    const resolved = execFileSync(process.execPath, ["--input-type=module", "-e", `console.log(import.meta.resolve("#testing"), import.meta.resolve("tst"))`], {
      cwd: join(workspace.root, "packages/providers"),
    }).toString();
    expect(resolved.trim().split(" ")).toStrictEqual([0, 1].map(() => `file://${workspace.root}/packages/testing/src/index.ts`));
  });

  it("the verifier's mocking routes really replace a repository module", () => {
    for (const [path, text] of Object.entries(VERIFIER_MOCKING)) workspace.write(path, text);
    const outputFile = join(workspace.root, "mocking.json");
    spawnSync(process.execPath, [join(repoRoot, "node_modules/vitest/vitest.mjs"), "run", "--root", workspace.root, "--reporter", "json", "--outputFile", outputFile, ...Object.keys(VERIFIER_MOCKING)], { stdio: "ignore" });
    const report = JSON.parse(readFileSync(outputFile, "utf8")) as { numPassedTests: number; numTotalTests: number };
    expect(report).toMatchObject({ numPassedTests: 2, numTotalTests: 2 });
  }, 60_000);
});
