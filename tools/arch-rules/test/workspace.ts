import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A throwaway workspace with this repository's real `contract`, `providers` and
// `testing` sources, linked the way pnpm links workspace packages, plus three more names
// for `testing/`: package `imports` aliases (`#testing`, and `#runtime-double`, which only
// Node's runtime resolution follows there), a workspace dependency under another name
// (`tst`) and a TypeScript `paths` mapping (`@double/*`).

export const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

export interface Workspace {
  readonly root: string;
  write(path: string, text: string): void;
  dispose(): void;
}

export function createWorkspace(): Workspace {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "arch-rules-")));
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const link = (name: string, target: string) => {
    mkdirSync(dirname(join(root, "node_modules", name)), { recursive: true });
    symlinkSync(target, join(root, "node_modules", name), "dir");
  };

  write("package.json", JSON.stringify({ name: "fixture", private: true, type: "module" }));
  const tsconfig = JSON.parse(readFileSync(join(repoRoot, "tsconfig.json"), "utf8"));
  tsconfig.compilerOptions.paths = { "@double/*": ["./packages/testing/src/*"] };
  tsconfig.include = ["packages", "apps"];
  write("tsconfig.json", JSON.stringify(tsconfig, null, 2));

  for (const name of ["contract", "providers", "testing"]) {
    cpSync(join(repoRoot, "packages", name, "src"), join(root, "packages", name, "src"), { recursive: true });
    cpSync(join(repoRoot, "packages", name, "package.json"), join(root, "packages", name, "package.json"));
    link(`@aiuteur/${name}`, join(root, "packages", name));
  }
  const providers = JSON.parse(readFileSync(join(root, "packages/providers/package.json"), "utf8"));
  // `#runtime-double` reaches testing/ only under Node's `node` condition, never under the compiler's.
  providers.imports = { "#testing": "@aiuteur/testing", "#runtime-double": { node: "@aiuteur/testing", default: "./src/index.ts" } };
  providers.dependencies["@aiuteur/testing"] = "workspace:*";
  write("packages/providers/package.json", JSON.stringify(providers, null, 2));
  link("tst", join(root, "packages", "testing"));

  for (const dependency of ["vitest", "fast-check", "@types"]) {
    link(dependency, realpathSync(join(repoRoot, "node_modules", dependency)));
  }
  return { root, write, dispose: () => rmSync(root, { recursive: true, force: true }) };
}
