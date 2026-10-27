import { expect, it } from "vitest";
import { checkWorkspace } from "@aiuteur/arch-rules";
import { createWorkspace } from "./workspace.ts";

it("EI12: CORE cannot import previs; previs and tests may", () => {
  const workspace = createWorkspace();
  try {
    workspace.write("packages/previs/src/index.ts", "export const stage = 1;\n");
    workspace.write("packages/accounts/src/leak.ts", [
      'import { stage } from "../../previs/src/index.ts";',
      'export * from "../../previs/src/index.ts";',
      'export const load = () => import("../../previs/src/index.ts");',
    ].join("\n"));
    workspace.write("packages/previs/src/allowed.ts", 'import { stage } from "./index.ts";\n');
    workspace.write("packages/accounts/test/stage.test.ts", 'import { stage } from "../../previs/src/index.ts";\n');
    const violations = checkWorkspace(workspace.root);
    expect(violations.map((v) => [v.rule, v.path, v.line])).toEqual([
      ["EI12", "packages/accounts/src/leak.ts", 1],
      ["EI12", "packages/accounts/src/leak.ts", 2],
      ["EI12", "packages/accounts/src/leak.ts", 3],
    ]);
  } finally { workspace.dispose(); }
});
