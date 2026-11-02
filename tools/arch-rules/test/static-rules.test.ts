import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkWorkspace, type Violation } from "@aiuteur/arch-rules";
import { createWorkspace, repoRoot, type Workspace } from "./workspace.ts";

// VC1 static rules beyond R19/R20: R3 (the client imports only contract), R16 (only media holds a BlobStore), R9 (vendor-name search), R24 (injected environment) and the
// `console` ban. The repository passes them; each planted fixture below is a mistake they exist to catch.
it("the repository passes R3, R16, R9, R24 and the console ban", () => {
  expect(checkWorkspace(repoRoot).filter((v) => ["R3", "R16", "R9", "R24", "LOG"].includes(v.rule))).toStrictEqual([]);
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
  "packages/observability/src/adapters/tracker.ts": `export const vendor = "Sentry";\n`,
  "packages/observability/src/logger.ts": `export const vendor = "Sentry";\n`,
  "packages/client/src/imports-contract.ts": `import { projectSchema } from "@aiuteur/contract";\nimport { local } from "./local.ts";\nexport { projectSchema, local };\nexport type { Project } from "@aiuteur/contract";\n`,
  "packages/client/src/local.ts": `export const local = 1;\n`,
  "packages/client/src/leaks-providers.ts": `import { select } from "@aiuteur/providers";\nexport const leaked = select;\n`,
  "packages/client/src/leaks-relative.ts": `export * from "../../providers/src/index.ts";\n`,
  "packages/client/src/leaks-dynamic.ts": `export const lazy = () => import("@aiuteur/providers");\n`,
  "packages/client/src/leaks-computed.ts": `export const lazy = (name: string) => import(\`../../providers/src/\${name}.ts\`);\n`,
  "packages/client/src/leaks-variable.ts": `export const lazy = (spec: string) => import(spec);\n`,
  "packages/client/src/leaks-unresolved.ts": `export * from "@aiuteur/store";\n`,
  "packages/client/test/doubles.test.ts": `import { FakeTransport } from "@aiuteur/testing";\nimport { select } from "@aiuteur/providers";\nexport const doubles = [FakeTransport, select];\n`,
  "packages/generation/src/imports-providers.ts": `import { select } from "@aiuteur/providers";\nexport const fine = select;\n`,
  "packages/workflows/src/holds-blobs.ts": `import type { BlobStore } from "@aiuteur/store";\nimport { deletableKey as d } from "../../store/src/index.ts";\nexport type B = BlobStore;\nexport const f = d;\n`,
  "packages/views/src/builds-r2.ts": `import { createR2BlobStore } from "@aiuteur/media";\nimport { deletableKey } from "@aiuteur/store";\nexport const r = [createR2BlobStore, deletableKey];\n`,
  "packages/store/src/index.ts": `export interface BlobStore { readonly x: 1 }\nexport const deletableKey = (k: string) => k.length > 0;\n`,
  "packages/media/src/holds.ts": `import type { BlobStore } from "@aiuteur/store";\nexport type B = BlobStore;\n`,
  "packages/workflows/src/media-only.ts": `import type { Media } from "@aiuteur/media";\nimport type { Scope } from "@aiuteur/store";\nexport type M = [Media, Scope];\n`,
  "apps/web/src/composition/production.ts": `import { createR2BlobStore } from "@aiuteur/media";\nexport const r = createR2BlobStore;\n`,
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
  "packages/observability/src/adapters/tracker.ts": [],
  "packages/observability/src/logger.ts": [["R9", 1]],
  "packages/client/src/imports-contract.ts": [],
  "packages/client/src/local.ts": [],
  "packages/client/src/leaks-providers.ts": [["R3", 1]],
  "packages/workflows/src/holds-blobs.ts": [["R16", 1], ["R16", 2]],
  "packages/views/src/builds-r2.ts": [["R16", 1], ["R16", 2]],
  "packages/media/src/holds.ts": [],
  "packages/store/src/index.ts": [],
  "packages/workflows/src/media-only.ts": [],
  "apps/web/src/composition/production.ts": [],
  "packages/client/src/leaks-relative.ts": [["R3", 1]],
  "packages/client/src/leaks-dynamic.ts": [["R3", 1]],
  "packages/client/src/leaks-computed.ts": [["R3", 1]],
  "packages/client/src/leaks-variable.ts": [["R3", 1]],
  "packages/client/src/leaks-unresolved.ts": [["R3", 1]],
  "packages/client/test/doubles.test.ts": [],
  "packages/generation/src/imports-providers.ts": [],
  "apps/server/src/composition/ci.ts": [],
};

describe("R3, R16, R9, R24 and the console ban judge what code does, not where a word appears", () => {
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
