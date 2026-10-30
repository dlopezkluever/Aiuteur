import { readdirSync } from "node:fs";
import { join } from "node:path";

/** The files of the code this process runs. A stack frame may name a file only if the index lists it. */
export interface SourceIndex { has(path: string): boolean }

/** No file is known: every frame reports `unknown`. The safe default. */
export const NO_SOURCE: SourceIndex = { has: () => false };

const SOURCE_DIRS = ["src", "scripts"];

/** Lists the TypeScript files under `<root>/packages/*` and `<root>/tools/*` (`src` and `scripts`), as absolute paths. Built once at boot by the composition root. */
export function indexSource(root: string): SourceIndex {
  const files = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.[cm]?ts$/.test(entry.name)) files.add(path);
    }
  };
  for (const group of ["packages", "tools"]) {
    let packages: string[] = [];
    try { packages = readdirSync(join(root, group)); } catch { continue; }
    for (const name of packages) for (const dir of SOURCE_DIRS) { try { walk(join(root, group, name, dir)); } catch { /* absent */ } }
  }
  return { has: (path) => files.has(path) };
}
