import { readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { parseSync } from "oxc-parser";

// Static build rules that hold from the first commit:
//   R19  Test doubles live in `testing/`; only tests and the local, ci and staging
//        composition roots import it; a ProviderTransport is implemented only by an
//        adapter or in `testing/`, and only `testing/` extends FakeTransport.
//   R20  Module-mocking APIs are banned on repository modules.
// (VERIFICATION-AND-OBSERVABILITY §3.2 line 2, §11.)

export interface SourceFile {
  /** Repository-relative, `/`-separated. */
  readonly path: string;
  readonly text: string;
}

export interface Violation {
  readonly rule: "R19" | "R20";
  readonly path: string;
  readonly line: number;
  readonly message: string;
}

const TESTING_PACKAGE = "@aiuteur/testing";
const TESTING_DIR = "packages/testing/";
const ADAPTERS_DIR = "packages/providers/src/adapters/";
const MOCKING_CALLS: Readonly<Record<string, ReadonlySet<string>>> = {
  vi: new Set(["mock", "doMock", "unmock", "doUnmock", "importMock", "importActual", "spyOn"]),
  vitest: new Set(["mock", "doMock", "unmock", "doUnmock", "importMock", "importActual", "spyOn"]),
  jest: new Set(["mock", "doMock", "unmock", "dontMock", "requireMock", "requireActual", "createMockFromModule", "spyOn"]),
};

/** A test file: `*.test.ts` or anything under a package's `test/` directory. */
export function isTestFile(path: string): boolean {
  return /\.test\.ts$/.test(path) || /^(packages|tools)\/[^/]+\/test\//.test(path);
}

/** A composition root that may wire test doubles (local, ci, staging; never production). */
export function isNonProductionCompositionRoot(path: string): boolean {
  return /(^|\/)composition\/(local|ci|staging)\.ts$/.test(path);
}

export function checkSources(files: readonly SourceFile[]): Violation[] {
  return files.flatMap(checkFile);
}

function checkFile(file: SourceFile): Violation[] {
  const result = parseSync(file.path, file.text);
  if (result.errors.length > 0) {
    return [{ rule: "R19", path: file.path, line: 1, message: `cannot parse: ${result.errors[0]?.message ?? "error"}` }];
  }
  const violations: Violation[] = [];
  const lineOf = (offset: number) => file.text.slice(0, offset).split("\n").length;
  const mayImportTesting =
    file.path.startsWith(TESTING_DIR) || isTestFile(file.path) || isNonProductionCompositionRoot(file.path);

  const specifiers: { value: string; start: number }[] = [
    ...result.module.staticImports.map((i) => ({ value: i.moduleRequest.value, start: i.start })),
    ...result.module.staticExports.flatMap((e) =>
      e.entries.flatMap((entry) => (entry.moduleRequest ? [{ value: entry.moduleRequest.value, start: e.start }] : [])),
    ),
  ];
  walk(result.program, (node) => {
    if (node.type === "ImportExpression") {
      const source = node["source"] as AstNode | undefined;
      if (source?.type === "Literal" && typeof source["value"] === "string") {
        specifiers.push({ value: source["value"], start: node.start as number });
      }
    }
  });
  if (!mayImportTesting) {
    for (const { value, start } of specifiers) {
      if (resolvesIntoTesting(file.path, value)) {
        violations.push({
          rule: "R19",
          path: file.path,
          line: lineOf(start),
          message: `non-test module imports testing/ ("${value}"); only tests and local, ci and staging composition roots may`,
        });
      }
    }
  }

  walk(result.program, (node) => {
    if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
      const implemented = ((node["implements"] as AstNode[] | null) ?? []).map((i) => nameOf(i["expression"]));
      if (implemented.includes("ProviderTransport") && !file.path.startsWith(TESTING_DIR) && !file.path.startsWith(ADAPTERS_DIR)) {
        violations.push({
          rule: "R19",
          path: file.path,
          line: lineOf(node.start as number),
          message: `ProviderTransport implemented outside ${ADAPTERS_DIR} and ${TESTING_DIR}`,
        });
      }
      if (nameOf(node["superClass"]) === "FakeTransport" && !file.path.startsWith(TESTING_DIR)) {
        violations.push({
          rule: "R19",
          path: file.path,
          line: lineOf(node.start as number),
          message: `a provider fake (extends FakeTransport) outside ${TESTING_DIR}`,
        });
      }
    }
    if (node.type === "CallExpression") {
      const callee = node["callee"] as AstNode | undefined;
      if (callee?.type === "MemberExpression" && !callee["computed"]) {
        const object = callee["object"] as AstNode;
        const property = nameOf(callee["property"]);
        const objectName = nameOf(object);
        // `mock.module()` and `t.mock.module()` are node:test's module mocking.
        const banned =
          (objectName !== undefined && property !== undefined && MOCKING_CALLS[objectName]?.has(property)) ||
          (property === "module" &&
            (objectName === "mock" || (object.type === "MemberExpression" && nameOf(object["property"]) === "mock")));
        if (banned) {
          violations.push({
            rule: "R20",
            path: file.path,
            line: lineOf(node.start as number),
            message: `module-mocking API ${objectName ?? "mock"}.${property}() is banned; enter doubles through a port`,
          });
        }
      }
    }
  });
  return violations;
}

function resolvesIntoTesting(fromPath: string, specifier: string): boolean {
  if (specifier === TESTING_PACKAGE || specifier.startsWith(`${TESTING_PACKAGE}/`)) return true;
  if (!specifier.startsWith(".")) return false;
  const target = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
  return target === TESTING_DIR.slice(0, -1) || target.startsWith(TESTING_DIR);
}

type AstNode = { readonly type: string; readonly [key: string]: unknown };

function nameOf(node: unknown): string | undefined {
  if (node === null || typeof node !== "object") return undefined;
  const n = node as AstNode;
  return n.type === "Identifier" && typeof n["name"] === "string" ? n["name"] : undefined;
}

function walk(node: unknown, visit: (node: AstNode) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (node === null || typeof node !== "object") return;
  const n = node as AstNode;
  if (typeof n.type === "string") visit(n);
  for (const value of Object.values(n)) {
    if (value !== null && typeof value === "object") walk(value, visit);
  }
}

/**
 * Top-level directories that hold no product code: documentation, legacy evidence,
 * throwaway prototypes (docs/README.md §1) and agent or tool configuration.
 */
const NOT_PRODUCT_CODE = new Set(["docs", "_inputs", "prototypes"]);

/** Every TypeScript source in the repository, excluding dependencies and NOT_PRODUCT_CODE. */
export function collectRepositorySources(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      if (dir === root && NOT_PRODUCT_CODE.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(m|c)?tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        files.push({ path: relative(root, full).split(sep).join("/"), text: readFileSync(full, "utf8") });
      }
    }
  };
  visit(root);
  return files;
}
