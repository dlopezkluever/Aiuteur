import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkWorkspace, type Violation } from "@aiuteur/arch-rules";
import { createWorkspace, repoRoot, type Workspace } from "./workspace.ts";

// VC1 static rules beyond R19/R20: R9 (vendor-name search), R24 (injected environment) and the
// `console` ban. The repository passes them; each planted fixture below is a mistake they exist to catch.
it("the repository passes R9, R24 and the console ban", () => {
  expect(checkWorkspace(repoRoot).filter((v) => ["R9", "R24", "LOG"].includes(v.rule))).toStrictEqual([]);
});

const TEXTS: Record<string, string> = {
  "packages/generation/src/names-a-vendor.ts": `// calls the OpenAI API\nexport const model = "gpt-5";\n`,
  "packages/generation/src/catalogue-in-json.json": `{ "model": "claude-opus" }\n`,
  "packages/providers/src/adapters/acme/names-a-vendor.ts": `export const vendor = "anthropic";\n`,
  "packages/providers/catalogue/models.json": `{ "model": "gemini" }\n`,
  "packages/generation/src/names-luma.ts": `export const vendor = "Luma";\n`,
  "packages/generation/src/names-other-providers.ts": `// Wan, Sora, Grok, LTX and Google are in PROVIDERS-AND-MODELS\n`,
  "packages/providers/src/adapters/luma/transport.ts": `export const vendor = "Luma";\n`,
  "packages/generation/src/env-destructured.ts": `const { env } = process;\nexport const flag = env.NODE_ENV;\n`,
  "packages/generation/src/env-computed.ts": `export const flag = process["env"].NODE_ENV;\nexport const other = process["env"]["VITEST"];\n`,
  "packages/generation/src/env-renamed.ts": `const { env: ambient } = process;\nexport const flag = ambient["CI"];\n`,
  "packages/generation/src/ordinary.ts": `export const stability = "stable"; // not a vendor\n`,
  "packages/generation/src/logs.ts": `export const log = (m: string) => console.log(m);\nexport const g = () => globalThis.console.error("x");\n`,
  "packages/generation/src/own-console.ts": `import { console } from "./logger.ts";\nconsole.log("typed logger");\n`,
  "packages/generation/test/logs.test.ts": `console.log("a test may print");\n`,
  "packages/store/scripts/tool.ts": `console.log("a script may print"); export const url = process.env["DATABASE_URL"];\n`,
  "packages/generation/src/reads-env.ts": `export const url = process.env["DATABASE_URL"];\nexport const meta = import.meta.env;\n`,
  "packages/generation/src/branches-on-flag.ts": `export const test = process.env.NODE_ENV === "test";\nconst { VITEST } = process.env;\nexport const v = VITEST;\n`,
  "packages/generation/test/flag-in-test.test.ts": `export const ci = process.env["CI"];\n`,
  "apps/server/src/composition/ci.ts": `export const env = process.env["AIUTEUR_ENV"];\nexport const flag = process.env.NODE_ENV;\n`,
};
const EXPECTED: Record<string, readonly [Violation["rule"], number][]> = {
  "packages/generation/src/names-a-vendor.ts": [["R9", 1], ["R9", 2]],
  "packages/generation/src/catalogue-in-json.json": [["R9", 1]],
  "packages/providers/src/adapters/acme/names-a-vendor.ts": [],
  "packages/providers/catalogue/models.json": [],
  "packages/generation/src/names-luma.ts": [["R9", 1]],
  "packages/generation/src/names-other-providers.ts": [["R9", 1]],
  "packages/providers/src/adapters/luma/transport.ts": [],
  "packages/generation/src/env-destructured.ts": [["R24", 1], ["R24", 2]],
  "packages/generation/src/env-computed.ts": [["R24", 1], ["R24", 2]],
  "packages/generation/src/env-renamed.ts": [["R24", 1], ["R24", 2]],
  "packages/generation/src/ordinary.ts": [],
  "packages/generation/src/logs.ts": [["LOG", 1], ["LOG", 2]],
  "packages/generation/src/own-console.ts": [],
  "packages/generation/test/logs.test.ts": [],
  "packages/store/scripts/tool.ts": [],
  "packages/generation/src/reads-env.ts": [["R24", 1], ["R24", 2]],
  "packages/generation/src/branches-on-flag.ts": [["R24", 1], ["R24", 2]],
  "packages/generation/test/flag-in-test.test.ts": [["R24", 1]],
  "apps/server/src/composition/ci.ts": [],
};

describe("R9, R24 and the console ban judge what code does, not where a word appears", () => {
  let workspace: Workspace;
  let violations: Violation[];
  beforeAll(() => {
    workspace = createWorkspace();
    for (const [path, text] of Object.entries(TEXTS)) workspace.write(path, text);
    workspace.write("packages/generation/src/logger.ts", `export const console = { log: (_: string) => {} };\n`);
    violations = checkWorkspace(workspace.root);
  });
  afterAll(() => workspace?.dispose());

  it.each(Object.entries(EXPECTED))("%s", (path, expected) => {
    const mine = violations.filter((v) => v.path === path).map((v) => [v.rule, v.line]);
    expect(mine).toStrictEqual(expected.map(([rule, line]) => [rule, line]));
  });
});
