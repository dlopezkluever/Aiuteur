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
//   R3   `client` imports only `contract` (MODULE-ARCHITECTURE §4, R3): nothing of Aiuteur but `packages/contract`.
//   R16  Only `media` holds a BlobStore (PERSISTENCE-AND-MEDIA §7.6, §10.4 R16, R17): the port, its adapters and its
//        delete guard are imported only by `media`, `testing/`, the Store package that defines the port, tests and
//        composition roots. So committed-media deletion and key building cannot happen anywhere else.
//   R9   Vendor and model names appear only in adapters and Catalogue data (MODULE-ARCHITECTURE §9).
//   R24  The environment is read only in composition roots and injected; no module branches on
//        an ambient test flag (VERIFICATION-AND-OBSERVABILITY §3.2 line 3).
//   LOG  No `console` in product code (OPERATIONAL-BASELINE §4.2); the typed logger is the only output.
//
// Names are judged by what they are bound to, not how they are spelled: an import is
// judged by the file it resolves to (package `imports` and `exports`, workspace links,
// tsconfig `paths`, relative paths), and `FakeTransport`, `ProviderTransport` and `vi`
// are recognised under any local alias. These checks catch mistakes and straightforward
// evasions; they are not a proof against deliberately obfuscated code.

export interface Violation {
  readonly rule: "R3" | "R16" | "R19" | "R20" | "EI12" | "R9" | "R24" | "LOG";
  /** Workspace-relative, `/`-separated. */
  readonly path: string;
  readonly line: number;
  readonly message: string;
}

const TESTING_DIR = "packages/testing/";
const CLIENT_DIR = "packages/client/";
const CONTRACT_DIR = "packages/contract/";
const PROVIDERS_DIR = "packages/providers/";
const ADAPTERS_DIR = "packages/providers/src/adapters/";
const TRANSPORT_TYPES = new Set(["ProviderTransport", "RealAdapter", "FakeAdapter"]);
/** The BlobStore port, its adapters and its delete guard (R16). */
const BLOB_NAMES = new Set(["BlobStore", "createR2BlobStore", "FakeBlobStore", "deletableKey"]);
const VITEST_OBJECTS = new Set(["vi", "vitest"]);
const MOCKING = new Set(["mock", "doMock", "unmock", "doUnmock", "importMock", "importActual", "spyOn"]);
const JEST_MOCKING = new Set(["mock", "doMock", "unmock", "dontMock", "requireMock", "requireActual", "createMockFromModule", "spyOn"]);

/** Top-level directories that hold no product code (docs/README.md §1). */
const NOT_PRODUCT_CODE = new Set(["docs", "_inputs", "prototypes"]);

/** A test file: `*.test.ts` or anything under a package's or tool's `test/` directory. */
export function isTestFile(path: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(path) || /^(packages|apps|tools)\/[^/]+\/test\//.test(path);
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
  return collectWorkspaceFiles(root, CODE);
}

const CODE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
/** Files R9 reads: code, and the data a vendor name could hide in. */
const TEXT = /\.(?:[cm]?[jt]s|[jt]sx|json|sql)$/;

function collectWorkspaceFiles(root: string, pattern: RegExp): string[] {
  const files: string[] = [];
  const visit = (dir: string, top: boolean) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      if (top && (entry.name.startsWith(".") || NOT_PRODUCT_CODE.has(entry.name))) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full, false);
      else if (entry.isFile() && pattern.test(entry.name)) files.push(relative(root, full).split(sep).join("/"));
    }
  };
  visit(root, true);
  return files.sort();
}

/** Where a vendor or model name may appear (R9): adapters, and the Catalogue data directory. */
const VENDOR_NAME_HOMES = [ADAPTERS_DIR, "packages/providers/catalogue/"];
/** The names R9 searches for, whole words, case-insensitive: the providers and models PROVIDERS-AND-MODELS names, and the tracing vendors VERIFICATION-AND-OBSERVABILITY forbids. */
export const VENDOR_NAMES = /\b(openai|anthropic|google|gemini|veo|kling|luma|wan|sora|grok|ltx|runway|elevenlabs|midjourney|replicate|claude|gpt-?[0-9]\w*|llama|mistral|ideogram|recraft|minimax|seedance|hailuo|imagen|stabilityai|sdxl|fal\.ai|sentry|langfuse|datadog|posthog)\b/i;
/** Ambient flags no module may branch on, wherever it lives outside a composition root. */
const AMBIENT_FLAGS = new Set(["NODE_ENV", "VITEST", "CI"]);
/** Files whose job is to name what they search for. */
const NAMES_THEIR_SEARCH = "tools/arch-rules/";

/** Checks R19, R20, EI12, R9, R24 and LOG over every source of the workspace at `root`. */
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
  const code = collectWorkspaceSources(root);
  return [
    ...code.flatMap((path) => checkFile(path, readFileSync(join(root, path), "utf8"), resolveFrom)),
    ...collectWorkspaceFiles(root, TEXT).filter((path) => /^(packages|apps|tools)\//.test(path)).flatMap((path) => checkVendorNames(path, readFileSync(join(root, path), "utf8"))),
  ];
}

/** R9 over one file's text (any file type the workspace scan reads). */
function checkVendorNames(path: string, text: string): Violation[] {
  if (path.startsWith(NAMES_THEIR_SEARCH) || VENDOR_NAME_HOMES.some((home) => path.startsWith(home))) return [];
  return text.split("\n").flatMap((line, index) => {
    const found = VENDOR_NAMES.exec(line);
    return found ? [{ rule: "R9" as const, path, line: index + 1, message: `vendor or model name "${found[0]}" outside adapters and Catalogue data` }] : [];
  });
}

/** Whether this file may read the ambient environment: composition roots, scripts and tests. */
const isProductionRoot = (path: string) => /(^|\/)composition\/production\.[cm]?[jt]s$/.test(path);
const mayReadEnvironment = (path: string) => isNonProductionCompositionRoot(path) || isProductionRoot(path) || /^(packages|apps|tools)\/[^/]+\/scripts\//.test(path) || isTestFile(path);

type AstNode = { readonly type: string; readonly start: number; readonly [key: string]: unknown };

function checkFile(path: string, text: string, resolveFrom: (path: string, specifier: string) => string | null): Violation[] {
  const result = parseSync(path, text);
  if (result.errors.length > 0) {
    return [{ rule: "R19", path, line: 1, message: `cannot parse: ${result.errors[0]?.message ?? "error"}` }];
  }
  const violations: Violation[] = [];
  const report = (rule: Violation["rule"], at: number, message: string) => {
    const line = text.slice(0, at).split("\n").length;
    // One finding per rule and line; the first message (the most specific, found first) stands.
    if (!violations.some((v) => v.rule === rule && v.line === line)) violations.push({ rule, path, line, message });
  };
  const into = (specifier: string, dir: string) => resolveFrom(path, specifier)?.startsWith(dir) === true;

  // R19 and EI12 share resolved static imports, exports and literal import().
  const mayImportTesting = path.startsWith(TESTING_DIR) || isTestFile(path) || isNonProductionCompositionRoot(path);
  const core = path.startsWith("packages/") && !path.startsWith("packages/previs/") && !path.startsWith(TESTING_DIR) && !isTestFile(path);
  // R3 judges the client's own sources; its tests may use the doubles like any test (R19 still governs them).
  const client = path.startsWith(CLIENT_DIR) && !isTestFile(path);
  if (!mayImportTesting || core || client) {
    const specifiers = [
      ...result.module.staticImports.map((i) => ({ value: i.moduleRequest.value, start: i.start })),
      ...result.module.staticExports.flatMap((e) => e.entries.flatMap((x) => (x.moduleRequest ? [{ value: x.moduleRequest.value, start: e.start }] : []))),
    ];
    walk(result.program, (node) => {
      const source = node["source"] as AstNode | undefined;
      if (node.type === "ImportExpression" && source?.type === "Literal" && typeof source["value"] === "string") {
        specifiers.push({ value: source["value"], start: node.start });
      } else if (client && node.type === "ImportExpression") {
        // R3 fails closed: a client import whose target is not a plain string cannot be shown to stay inside contract.
        report("R3", node.start, "client dynamic import() with a computed specifier cannot be proven to import only contract");
      }
    });
    for (const { value, start } of specifiers) {
      if (!mayImportTesting && into(value, TESTING_DIR)) report("R19", start, `non-test module imports testing/ ("${value}"); only tests and local, ci and staging composition roots may`);
      if (client) {
        const resolved = resolveFrom(path, value);
        const reachesAiuteur = value.startsWith("@aiuteur/") || (resolved !== null && /^(packages|apps|tools)\//.test(resolved) && !resolved.startsWith(CLIENT_DIR));
        const isContract = value === "@aiuteur/contract" || resolved?.startsWith(CONTRACT_DIR) === true;
        if (reachesAiuteur && !isContract) report("R3", start, `client imports "${value}"; the client imports only contract`);
      }
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
  // R16: who may hold a BlobStore. Judged on the imported name and where its module resolves (or names, if unresolved).
  const mayHoldBlobs = path.startsWith("packages/media/") || path.startsWith(TESTING_DIR) || path.startsWith("packages/store/") || isTestFile(path) || isNonProductionCompositionRoot(path) || isProductionRoot(path);
  if (!mayHoldBlobs) {
    for (const node of result.program.body as unknown as AstNode[]) {
      if (node.type !== "ImportDeclaration") continue;
      const from = (node["source"] as { value: string }).value;
      const blobModule = /^@aiuteur\/(store|media|testing)$/.test(from) || ["packages/store/", "packages/media/", TESTING_DIR].some((dir) => into(from, dir));
      if (!blobModule) continue;
      for (const specifier of node["specifiers"] as AstNode[]) {
        const imported = specifier.type === "ImportSpecifier" ? nameOf(specifier["imported"]) : undefined;
        if (imported !== undefined && BLOB_NAMES.has(imported)) report("R16", specifier.start, `${imported} imported outside media; only media holds a BlobStore`);
      }
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

  // `const { env } = process` (or `{ env: e }`): the local names that hold the ambient environment.
  const envNames = new Set<string>();
  walk(result.program, (node) => {
    if (node.type === "VariableDeclarator" && (node["id"] as AstNode).type === "ObjectPattern" && nameOf(node["init"]) === "process") {
      for (const property of (node["id"] as AstNode)["properties"] as AstNode[]) {
        const local = nameOf(property["value"]);
        if ((nameOf(property["key"]) ?? stringValue(property["key"])) === "env" && local !== undefined) envNames.add(local);
      }
      if (!mayReadEnvironment(path)) report("R24", node.start, "process.env read outside a composition root; inject it");
    }
  });
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
      // LOG: `console.x` and `globalThis.console`, outside tests and scripts.
      const object0 = node["object"] as AstNode;
      if (!isTestFile(path) && !/^(packages|apps|tools)\/[^/]+\/scripts\//.test(path) && ((nameOf(object0) === "console" && !bindings.has("console")) || (nameOf(object0) === "globalThis" && property === "console"))) {
        report("LOG", node.start, "console is banned in product code; use the typed logger");
      }
      // R24: the ambient environment is read in composition roots only (scripts and tests may read their own inputs, never a flag).
      if (isProcessEnv(node, envNames) || isProcessEnv(object0, envNames)) {
        const flag = isProcessEnv(node, envNames) ? undefined : property;
        if (flag !== undefined && AMBIENT_FLAGS.has(flag) && !isNonProductionCompositionRoot(path) && !isProductionRoot(path)) report("R24", node.start, `ambient flag ${flag} read outside a composition root; inject the environment`);
        else if (flag === undefined && node.type === "MemberExpression" && isProcessEnv(node) && !mayReadEnvironment(path)) report("R24", node.start, "process.env read outside a composition root; inject it");
      }
      const object = node["object"] as AstNode;
      const banned =
        (property !== undefined && MOCKING.has(property) && isVitestObject(object)) ||
        (property !== undefined && JEST_MOCKING.has(property) && nameOf(object) === "jest") ||
        // node:test's module mocking: `mock.module()` and `t.mock.module()`.
        (property === "module" && (nameOf(object) === "mock" || (object.type === "MemberExpression" && nameOf(object["property"]) === "mock")));
      if (banned) report("R20", node.start, `module-mocking API ${text.slice(node.start, node["end"] as number)} is banned; enter doubles through a port`);
    }
    if (node.type === "VariableDeclarator" && (node["id"] as AstNode).type === "ObjectPattern" && isProcessEnv(node["init"], envNames) && !isNonProductionCompositionRoot(path) && !isProductionRoot(path)) {
      for (const property of (node["id"] as AstNode)["properties"] as AstNode[]) {
        const key = nameOf(property["key"]) ?? stringValue(property["key"]);
        if (key !== undefined && AMBIENT_FLAGS.has(key)) report("R24", property.start, `ambient flag ${key} read outside a composition root; inject the environment`);
      }
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

/** `process.env` or `import.meta.env`. */
function isProcessEnv(node: unknown, aliases: ReadonlySet<string> = new Set()): boolean {
  const n = node as AstNode | null;
  if (n?.type === "Identifier") return aliases.has(n["name"] as string);
  if (n?.type !== "MemberExpression" || memberName(n) !== "env") return false;
  const object = n["object"] as AstNode;
  return nameOf(object) === "process" || object.type === "MetaProperty";
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
