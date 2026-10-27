import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseSync } from "oxc-parser";
import { ResolverFactory } from "oxc-resolver";

// Static build rules that hold from the first commit (VERIFICATION-AND-OBSERVABILITY §3.2
// line 2, §4, §11):
//   R19  Test doubles live in `testing/`; only tests and the local, ci and staging
//        composition roots import it. A ProviderTransport is implemented (`implements`)
//        only in an adapter or in `testing/`, and only `testing/` extends FakeTransport.
//   R20  Module-mocking APIs are banned on repository modules.
//   EI12 No CORE module imports previs (BUILD-SEQUENCE §5; issue #98).
//
// Names are judged by what they are bound to, not how they are spelled: an import is
// judged by the file it resolves to (package `imports` and `exports`, workspace links,
// tsconfig `paths`, relative paths), and `FakeTransport`, `ProviderTransport` and `vi`
// are recognised under any local alias. These checks catch mistakes and straightforward
// evasions; they are not a proof against deliberately obfuscated code.

export interface Violation {
  readonly rule: "R19" | "R20" | "EI12";
  /** Workspace-relative, `/`-separated. */
  readonly path: string;
  readonly line: number;
  readonly message: string;
}

const TESTING_DIR = "packages/testing/";
const PROVIDERS_DIR = "packages/providers/";
const ADAPTERS_DIR = "packages/providers/src/adapters/";
const TRANSPORT_TYPES = new Set(["ProviderTransport", "RealAdapter", "FakeAdapter"]);
const VITEST_OBJECTS = new Set(["vi", "vitest"]);
const MOCKING = new Set(["mock", "doMock", "unmock", "doUnmock", "importMock", "importActual", "spyOn"]);
const JEST_MOCKING = new Set(["mock", "doMock", "unmock", "dontMock", "requireMock", "requireActual", "createMockFromModule", "spyOn"]);

/** Top-level directories that hold no product code (docs/README.md §1). */
const NOT_PRODUCT_CODE = new Set(["docs", "_inputs", "prototypes"]);

/** A test file: `*.test.ts` or anything under a package's or tool's `test/` directory. */
export function isTestFile(path: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(path) || /^(packages|tools)\/[^/]+\/test\//.test(path);
}

/** A composition root that may wire test doubles (local, ci, staging; never production). */
export function isNonProductionCompositionRoot(path: string): boolean {
  return /(^|\/)composition\/(local|ci|staging)\.[cm]?[jt]s$/.test(path);
}

/**
 * Every source file of the workspace, outside `node_modules`, the top-level
 * dot-directories (git, agent and tool configuration) and NOT_PRODUCT_CODE.
 * Dot-directories below the top level are scanned.
 */
export function collectWorkspaceSources(root: string): string[] {
  const files: string[] = [];
  const visit = (dir: string, top: boolean) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      if (top && (entry.name.startsWith(".") || NOT_PRODUCT_CODE.has(entry.name))) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full, false);
      else if (entry.isFile() && /\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name)) files.push(relative(root, full).split(sep).join("/"));
    }
  };
  visit(root, true);
  return files.sort();
}

/** Checks R19, R20 and EI12 over every source of the workspace at `root`. */
export function checkWorkspace(root: string): Violation[] {
  root = resolve(root);
  const resolver = new ResolverFactory({
    conditionNames: ["node", "import", "default"],
    extensions: [".ts", ".tsx", ".mts", ".js", ".mjs", ".json"],
    tsconfig: { configFile: join(root, "tsconfig.json"), references: "auto" },
  });
  /** The workspace-relative real path a specifier resolves to, or null. */
  const resolveFrom = (path: string, specifier: string): string | null => {
    const found = resolver.sync(dirname(join(root, path)), specifier).path;
    return found === undefined ? null : relative(root, found).split(sep).join("/");
  };
  return collectWorkspaceSources(root).flatMap((path) => checkFile(path, readFileSync(join(root, path), "utf8"), resolveFrom));
}

type AstNode = { readonly type: string; readonly start: number; readonly [key: string]: unknown };

function checkFile(path: string, text: string, resolveFrom: (path: string, specifier: string) => string | null): Violation[] {
  const result = parseSync(path, text);
  if (result.errors.length > 0) {
    return [{ rule: "R19", path, line: 1, message: `cannot parse: ${result.errors[0]?.message ?? "error"}` }];
  }
  const violations: Violation[] = [];
  const report = (rule: Violation["rule"], at: number, message: string) =>
    violations.push({ rule, path, line: text.slice(0, at).split("\n").length, message });
  const into = (specifier: string, dir: string) => resolveFrom(path, specifier)?.startsWith(dir) === true;

  // R19 and EI12 share resolved static imports, exports and literal import().
  const mayImportTesting = path.startsWith(TESTING_DIR) || isTestFile(path) || isNonProductionCompositionRoot(path);
  const core = path.startsWith("packages/") && !path.startsWith("packages/previs/") && !path.startsWith(TESTING_DIR) && !isTestFile(path);
  if (!mayImportTesting || core) {
    const specifiers = [
      ...result.module.staticImports.map((i) => ({ value: i.moduleRequest.value, start: i.start })),
      ...result.module.staticExports.flatMap((e) => e.entries.flatMap((x) => (x.moduleRequest ? [{ value: x.moduleRequest.value, start: e.start }] : []))),
    ];
    walk(result.program, (node) => {
      const source = node["source"] as AstNode | undefined;
      if (node.type === "ImportExpression" && source?.type === "Literal" && typeof source["value"] === "string") {
        specifiers.push({ value: source["value"], start: node.start });
      }
    });
    for (const { value, start } of specifiers) {
      if (!mayImportTesting && into(value, TESTING_DIR)) report("R19", start, `non-test module imports testing/ ("${value}"); only tests and local, ci and staging composition roots may`);
      if (core && into(value, "packages/previs/")) report("EI12", start, "CORE must not import previs; wire the stage at its composition root");
    }
  }

  // What each imported local name is bound to: (module specifier, exported name or "*").
  const bindings = new Map<string, { readonly from: string; readonly name: string }>();
  for (const node of result.program.body as unknown as AstNode[]) {
    if (node.type !== "ImportDeclaration") continue;
    const from = (node["source"] as { value: string }).value;
    for (const specifier of node["specifiers"] as AstNode[]) {
      const local = nameOf(specifier["local"]);
      if (local === undefined) continue;
      const imported = specifier.type === "ImportSpecifier" ? nameOf(specifier["imported"]) : specifier.type === "ImportNamespaceSpecifier" ? "*" : "default";
      if (imported !== undefined) bindings.set(local, { from, name: imported });
    }
  }
  /** Whether `node` names export `name` of a module resolving into `dir`, directly or through a namespace import. */
  const refersTo = (node: unknown, names: ReadonlySet<string>, dir: string): boolean => {
    const n = node as AstNode | null;
    if (n?.type === "Identifier") {
      const binding = bindings.get(n["name"] as string);
      return binding !== undefined && names.has(binding.name) && into(binding.from, dir);
    }
    if (n?.type === "MemberExpression" && !n["computed"]) {
      const binding = bindings.get(nameOf(n["object"]) ?? "");
      const property = nameOf(n["property"]);
      return binding?.name === "*" && property !== undefined && names.has(property) && into(binding.from, dir);
    }
    return false;
  };
  /** Vitest's `vi` (or its `vitest` alias) under any local name, or as a member of a namespace import. */
  const isVitestObject = (node: unknown): boolean => {
    const n = node as AstNode | null;
    if (n?.type === "Identifier") {
      const binding = bindings.get(n["name"] as string);
      return binding === undefined ? VITEST_OBJECTS.has(n["name"] as string) : binding.from === "vitest" && VITEST_OBJECTS.has(binding.name);
    }
    return n?.type === "MemberExpression" && !n["computed"] && bindings.get(nameOf(n["object"]) ?? "")?.name === "*" &&
      bindings.get(nameOf(n["object"]) ?? "")?.from === "vitest" && VITEST_OBJECTS.has(nameOf(n["property"]) ?? "");
  };

  walk(result.program, (node) => {
    if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
      if (!path.startsWith(TESTING_DIR) && refersTo(node["superClass"], new Set(["FakeTransport"]), TESTING_DIR)) {
        report("R19", node.start, `a provider fake (extends FakeTransport) outside ${TESTING_DIR}`);
      }
      const implemented = ((node["implements"] as AstNode[] | null) ?? []).map((i) => i["expression"]);
      if (!path.startsWith(TESTING_DIR) && !path.startsWith(ADAPTERS_DIR) && implemented.some((e) => refersTo(e, TRANSPORT_TYPES, PROVIDERS_DIR))) {
        report("R19", node.start, `ProviderTransport implemented outside ${ADAPTERS_DIR} and ${TESTING_DIR}`);
      }
    }
    if (node.type === "MemberExpression") {
      const property = memberName(node);
      const object = node["object"] as AstNode;
      const banned =
        (property !== undefined && MOCKING.has(property) && isVitestObject(object)) ||
        (property !== undefined && JEST_MOCKING.has(property) && nameOf(object) === "jest") ||
        // node:test's module mocking: `mock.module()` and `t.mock.module()`.
        (property === "module" && (nameOf(object) === "mock" || (object.type === "MemberExpression" && nameOf(object["property"]) === "mock")));
      if (banned) report("R20", node.start, `module-mocking API ${text.slice(node.start, node["end"] as number)} is banned; enter doubles through a port`);
    }
    if (node.type === "VariableDeclarator" && (node["id"] as AstNode).type === "ObjectPattern" && isVitestObject(node["init"])) {
      for (const property of (node["id"] as AstNode)["properties"] as AstNode[]) {
        const key = nameOf(property["key"]) ?? stringValue(property["key"]);
        if (key !== undefined && MOCKING.has(key)) report("R20", property.start, `module-mocking API ${key} is banned; enter doubles through a port`);
      }
    }
  });
  return violations;
}

/** The property a member expression selects: `a.b`, or `a["b"]` with a literal key. */
function memberName(node: AstNode): string | undefined {
  return node["computed"] ? stringValue(node["property"]) : nameOf(node["property"]);
}

function stringValue(node: unknown): string | undefined {
  const n = node as AstNode | null;
  if (n?.type === "Literal" && typeof n["value"] === "string") return n["value"];
  const quasis = n?.type === "TemplateLiteral" && (n["expressions"] as unknown[]).length === 0 ? (n["quasis"] as AstNode[]) : undefined;
  return quasis ? ((quasis[0]?.["value"] as { cooked: string }).cooked) : undefined;
}

function nameOf(node: unknown): string | undefined {
  const n = node as AstNode | null;
  return n?.type === "Identifier" && typeof n["name"] === "string" ? n["name"] : undefined;
}

function walk(node: unknown, visit: (node: AstNode) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (node === null || typeof node !== "object") return;
  const n = node as AstNode;
  if (typeof n.type === "string") visit(n);
  for (const value of Object.values(n)) if (value !== null && typeof value === "object") walk(value, visit);
}
