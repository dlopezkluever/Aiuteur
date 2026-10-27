import { readdirSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ResolverFactory } from "oxc-resolver";
import ts from "typescript-api";

// Static build rules that hold from the first commit (VERIFICATION-AND-OBSERVABILITY §3.2
// line 2, §4, §11):
//   R19  Test doubles live in `testing/`. Only tests and the local, ci and staging
//        composition roots reach it. A ProviderTransport is implemented only by an adapter
//        or in `testing/`, and a provider fake extends FakeTransport and lives in `testing/`.
//   R20  Doubles enter only through ports; module-mocking APIs are banned.
//
// Both rules are checked on meaning, not spelling. Imports are judged by the file they
// resolve to, under the compiler's resolution (tsconfig `paths`, package `imports` and
// `exports`, workspace links) and under Node's runtime resolution. Transports, fakes and
// mocking APIs are recognised by the TypeScript type checker: by structural
// assignability, by the declaration a call or property resolves to, and by the types
// that flow through aliases, destructuring and computed access. TypeScript 7 has no
// compiler API, so the checker uses the TypeScript 5.9 API as an analysis library;
// `pnpm typecheck` stays on TypeScript 7.

export interface Violation {
  readonly rule: "R19" | "R20";
  /** Workspace-relative, `/`-separated. */
  readonly path: string;
  readonly line: number;
  readonly message: string;
}

const TESTING_DIR = "packages/testing/";
const ADAPTERS_DIR = "packages/providers/src/adapters/";
const TRANSPORT_FILE = "packages/providers/src/transport.ts";
const FAKE_TRANSPORT_FILE = "packages/testing/src/fake-transport.ts";

/** Top-level directories that hold no product code (docs/README.md §1). */
const NOT_PRODUCT_CODE = new Set(["docs", "_inputs", "prototypes"]);
const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

/** Vitest's module-mocking utilities (`vi` and its `vitest` alias). */
const VITEST_MOCKING = ["mock", "doMock", "unmock", "doUnmock", "importMock", "importActual", "spyOn"];
/** `jest` is not installed, so it has no declarations to resolve against; matched by name. */
const JEST_MOCKING = new Set(["mock", "doMock", "unmock", "dontMock", "requireMock", "requireActual", "createMockFromModule", "spyOn"]);

/** A test file: `*.test.ts` or anything under a package's or tool's `test/` directory. */
export function isTestFile(path: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(path) || /^(packages|tools)\/[^/]+\/test\//.test(path);
}

/** A composition root that may wire test doubles (local, ci, staging; never production). */
export function isNonProductionCompositionRoot(path: string): boolean {
  return /(^|\/)composition\/(local|ci|staging)\.[cm]?[jt]s$/.test(path);
}

/** Files that may reach `testing/`. Every other file must not reach any of them. */
export function isTestSide(path: string): boolean {
  return path.startsWith(TESTING_DIR) || isTestFile(path) || isNonProductionCompositionRoot(path);
}

/**
 * Every source file of the workspace: all TypeScript and JavaScript outside
 * `node_modules`, the top-level dot-directories (git, agent and tool configuration) and
 * NOT_PRODUCT_CODE. Dot-directories below the top level are scanned.
 */
export function collectWorkspaceSources(root: string): string[] {
  const files: string[] = [];
  const visit = (dir: string, top: boolean) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      if (top && (entry.name.startsWith(".") || NOT_PRODUCT_CODE.has(entry.name))) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full, false);
      else if (entry.isFile() && SOURCE.test(entry.name)) files.push(relative(root, full).split(sep).join("/"));
    }
  };
  visit(root, true);
  return files.sort();
}

interface Anchors {
  readonly anyTransport: ts.Type;
  readonly fakeKindTransport: ts.Type;
  readonly fakeTransport: ts.Type;
  readonly transportSymbol: ts.Symbol;
  /** Property symbols of the module-mocking APIs. */
  readonly mockingProperties: ReadonlySet<ts.Symbol>;
}

const PROBE = "__arch_rules_probe__.ts";

/** Checks R19 and R20 over every source of the workspace at `root`. */
export function checkWorkspace(root: string): Violation[] {
  root = resolve(root);
  const sources = collectWorkspaceSources(root);
  const config = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    },
  });
  if (config === undefined) throw new Error(`cannot read ${join(root, "tsconfig.json")}`);
  const options: ts.CompilerOptions = { ...config.options, allowJs: true, checkJs: false, noEmit: true };

  const probePath = join(root, PROBE);
  const probeText = [
    `import type { ProviderTransport } from "./${TRANSPORT_FILE}";`,
    `import type { FakeTransport } from "./${FAKE_TRANSPORT_FILE}";`,
    `import { vi } from "vitest";`,
    `import { mock } from "node:test";`,
    `export type AnyTransport = ProviderTransport;`,
    `export type FakeKindTransport = ProviderTransport<"fake">;`,
    `export type Fake = FakeTransport;`,
    `export declare const vitestUtils: typeof vi;`,
    `export declare const nodeTestMock: typeof mock;`,
  ].join("\n");
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, language, onError, create) =>
    resolve(fileName) === probePath
      ? ts.createSourceFile(fileName, probeText, language, true)
      : getSourceFile(fileName, language, onError, create);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (fileName) => resolve(fileName) === probePath || fileExists(fileName);

  const program = ts.createProgram({ rootNames: [...sources.map((s) => join(root, s)), probePath], options, host });
  const checker = program.getTypeChecker();
  const anchors = findAnchors(program, checker, probePath);
  const runtime = [
    new ResolverFactory({ conditionNames: ["node", "import", "default"], extensions: [".ts", ".tsx", ".mts", ".js", ".mjs", ".json"], builtinModules: true }),
    new ResolverFactory({ conditionNames: ["node", "require", "default"], extensions: [".ts", ".tsx", ".cts", ".js", ".cjs", ".json"], builtinModules: true }),
  ];

  const violations: Violation[] = [];
  for (const path of sources) {
    const sourceFile = program.getSourceFile(join(root, path));
    if (sourceFile === undefined) throw new Error(`not in the program: ${path}`);
    const report = (rule: Violation["rule"], node: ts.Node, message: string) => {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      if (!violations.some((v) => v.path === path && v.line === line && v.message === message)) {
        violations.push({ rule, path, line, message });
      }
    };
    checkImports(path, sourceFile, { root, options, host, runtime, checker }, report);
    checkTransports(path, sourceFile, checker, anchors, report);
    checkMocking(sourceFile, checker, anchors, report);
  }
  return violations;
}

type Report = (rule: Violation["rule"], node: ts.Node, message: string) => void;

function findAnchors(program: ts.Program, checker: ts.TypeChecker, probePath: string): Anchors {
  const probe = program.getSourceFile(probePath);
  const module = probe && checker.getSymbolAtLocation(probe);
  if (module === undefined) throw new Error("the rule probe did not load");
  const exported = new Map(checker.getExportsOfModule(module).map((s) => [s.getName(), s]));
  const type = (name: string, value = false) => {
    const symbol = exported.get(name);
    const t = symbol && (value ? checker.getTypeOfSymbol(symbol) : checker.getDeclaredTypeOfSymbol(symbol));
    if (t === undefined || t.flags & ts.TypeFlags.Any) {
      throw new Error(`cannot resolve ${name}: the workspace must contain ${TRANSPORT_FILE}, ${FAKE_TRANSPORT_FILE} and vitest`);
    }
    return t;
  };
  const anyTransport = type("AnyTransport");
  const transportSymbol = anyTransport.getSymbol();
  if (transportSymbol === undefined) throw new Error("ProviderTransport has no symbol");

  const mockingProperties = new Set<ts.Symbol>();
  const vitestUtils = type("vitestUtils", true);
  for (const name of VITEST_MOCKING) {
    const property = vitestUtils.getProperty(name);
    if (property === undefined) throw new Error(`vitest has no vi.${name}; update VITEST_MOCKING`);
    mockingProperties.add(property);
  }
  const nodeModuleMock = type("nodeTestMock", true).getProperty("module");
  if (nodeModuleMock !== undefined) mockingProperties.add(nodeModuleMock);
  return {
    anyTransport,
    fakeKindTransport: type("FakeKindTransport"),
    fakeTransport: type("Fake"),
    transportSymbol,
    mockingProperties,
  };
}

interface ResolutionContext {
  readonly root: string;
  readonly options: ts.CompilerOptions;
  readonly host: ts.ModuleResolutionHost;
  readonly runtime: readonly ResolverFactory[];
  readonly checker: ts.TypeChecker;
}

/** R19: a file outside the test side must not resolve, by any route, to a test-side file. */
function checkImports(path: string, sourceFile: ts.SourceFile, ctx: ResolutionContext, report: Report): void {
  if (isTestSide(path)) return;
  const file = join(ctx.root, path);
  const check = (specifierNode: ts.Node | undefined, anchor: ts.Node) => {
    if (specifierNode === undefined || !ts.isStringLiteralLike(specifierNode)) {
      report("R19", anchor, "module specifier is not a string literal, so R19 cannot verify where it leads");
      return;
    }
    const specifier = specifierNode.text;
    const targets = resolveEverywhere(specifier, file, ctx);
    if (targets.length === 0) {
      if (!isBuiltin(specifier)) report("R19", anchor, `cannot resolve "${specifier}", so R19 cannot verify where it leads`);
      return;
    }
    for (const target of targets) {
      const relativeTarget = relative(ctx.root, target).split(sep).join("/");
      if (!relativeTarget.startsWith("..") && isTestSide(relativeTarget)) {
        report("R19", anchor, `non-test module reaches test-side ${relativeTarget} through "${specifier}"; only tests and local, ci and staging composition roots may`);
      }
    }
  };
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      check(node.moduleSpecifier, node);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      check(node.moduleReference.expression, node);
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      check(ts.isLiteralTypeNode(argument) ? argument.literal : undefined, node);
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || isRequire(node.expression, ctx.checker))) {
      check(node.arguments[0], node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

/** `require`, or any function typed as Node's `Require` (for example from `createRequire`). */
function isRequire(callee: ts.Expression, checker: ts.TypeChecker): boolean {
  if (ts.isIdentifier(callee) && callee.text === "require") return true;
  const symbol = checker.getTypeAtLocation(callee).getSymbol();
  return symbol?.getName() === "Require" && (symbol.getDeclarations() ?? []).some((d) => d.getSourceFile().fileName.includes("/@types/node/"));
}

/** Real paths a specifier resolves to, under the compiler and under Node (import and require). */
function resolveEverywhere(specifier: string, file: string, ctx: ResolutionContext): string[] {
  const found = new Set<string>();
  for (const mode of [ts.ModuleKind.ESNext, ts.ModuleKind.CommonJS] as const) {
    const resolved = ts.resolveModuleName(specifier, file, ctx.options, ctx.host, undefined, undefined, mode).resolvedModule;
    if (resolved !== undefined) found.add(resolve(resolved.resolvedFileName));
  }
  for (const resolver of ctx.runtime) {
    const result = resolver.sync(dirname(file), specifier);
    if (result.path !== undefined) found.add(resolve(result.path));
  }
  return [...found];
}

/**
 * R19: transports and fakes by structure. A class, object literal or type assertion is a
 * ProviderTransport if its type is assignable to one, whatever the names involved; a
 * fake is anything assignable to FakeTransport, which its private fields make nominal.
 */
function checkTransports(path: string, sourceFile: ts.SourceFile, checker: ts.TypeChecker, anchors: Anchors, report: Report): void {
  const inTesting = path.startsWith(TESTING_DIR);
  const mayImplement = inTesting || path.startsWith(ADAPTERS_DIR);
  const assignable = (type: ts.Type, target: ts.Type) =>
    !(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Never)) && checker.isTypeAssignableTo(type, target);

  const judge = (node: ts.Node, type: ts.Type, what: string) => {
    const fake = assignable(type, anchors.fakeTransport);
    if (fake && !inTesting) report("R19", node, `${what} is a provider fake (a FakeTransport) outside ${TESTING_DIR}`);
    if (!fake && assignable(type, anchors.fakeKindTransport)) {
      report("R19", node, `${what} is a fake-kind ProviderTransport that does not extend FakeTransport`);
    }
    if (!mayImplement && assignable(type, anchors.anyTransport)) {
      report("R19", node, `${what} is a ProviderTransport implementation outside ${ADAPTERS_DIR} and ${TESTING_DIR}`);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const constructor = checker.getTypeAtLocation(node.name ?? node);
      const instance = node.name
        ? checker.getDeclaredTypeOfSymbol(checker.getSymbolAtLocation(node.name)!)
        : constructor.getConstructSignatures()[0]?.getReturnType();
      if (instance !== undefined) judge(node, instance, `class ${node.name?.text ?? "(anonymous)"}`);
      for (const clause of node.heritageClauses ?? []) {
        if (clause.token !== ts.SyntaxKind.ImplementsKeyword) continue;
        for (const implemented of clause.types) {
          if (checker.getTypeAtLocation(implemented).getSymbol() === anchors.transportSymbol && !mayImplement) {
            report("R19", implemented, `implements ProviderTransport outside ${ADAPTERS_DIR} and ${TESTING_DIR}`);
          }
        }
      }
    } else if (ts.isObjectLiteralExpression(node)) {
      judge(node, checker.getTypeAtLocation(node), "object literal");
    } else if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      const asserted = checker.getTypeAtLocation(node.type);
      if (!mayImplement && assignable(asserted, anchors.anyTransport)) {
        report("R19", node, `asserts a value to a ProviderTransport type outside ${ADAPTERS_DIR} and ${TESTING_DIR}`);
      }
    } else if (!mayImplement && ts.isExpression(node) && checker.getTypeAtLocation(node).flags & ts.TypeFlags.Any) {
      const contextual = checker.getContextualType(node);
      if (contextual !== undefined && assignable(contextual, anchors.anyTransport)) {
        report("R19", node, "an untyped (any) value is used as a ProviderTransport, so R19 cannot verify what it is");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

/**
 * R20: a module-mocking API is banned whatever it is called. Every way to take a value
 * from the mocking object is judged by the property symbol it selects (property access,
 * literal computed access, destructuring); a computed key that is not a literal fails;
 * and the object may not escape into a position the checker cannot follow (an argument,
 * a spread, a return value, an assertion). So whatever name a mocking function ends up
 * under, the place it was taken from fails.
 */
function checkMocking(sourceFile: ts.SourceFile, checker: ts.TypeChecker, anchors: Anchors, report: Report): void {
  const banned = (symbol: ts.Symbol | undefined) => symbol !== undefined && anchors.mockingProperties.has(symbol);
  const carriesMocking = (type: ts.Type) =>
    !(type.flags & ts.TypeFlags.Any) && type.getProperties().some((p) => anchors.mockingProperties.has(p));
  const message = (name: string) => `module-mocking API ${name} is banned; enter doubles through a port`;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === "jest" &&
        JEST_MOCKING.has(callee.name.text)) {
        report("R20", node, message(`jest.${callee.name.text}`));
      }
    } else if (ts.isPropertyAccessExpression(node)) {
      if (banned(checker.getSymbolAtLocation(node.name))) report("R20", node, message(node.getText(sourceFile)));
    } else if (ts.isElementAccessExpression(node)) {
      const objectType = checker.getTypeAtLocation(node.expression);
      if (carriesMocking(objectType)) {
        // Only a literal key is trusted: a variable or an asserted key type can lie.
        const key = node.argumentExpression;
        if (!ts.isStringLiteralLike(key)) {
          report("R20", node, "computed access to a module-mocking object with a non-literal key");
        } else if (banned(objectType.getProperty(key.text))) {
          report("R20", node, message(node.getText(sourceFile)));
        }
      }
    } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      const sourceType = checker.getTypeAtLocation(node.parent);
      if (carriesMocking(sourceType)) {
        const key = node.propertyName ?? node.name;
        if (node.dotDotDotToken !== undefined) {
          report("R20", node, "rest destructuring of a module-mocking object");
        } else if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
          if (banned(sourceType.getProperty(key.text))) report("R20", node, message(`destructured ${key.text}`));
        } else {
          report("R20", node, "computed destructuring of a module-mocking object");
        }
      }
    } else if ((ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) && isEscape(node) && carriesMocking(checker.getTypeAtLocation(node))) {
      report("R20", node, "a module-mocking object is passed where the checker cannot follow it");
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

/** An expression position from which a value can leave the reach of the property checks. */
function isEscape(node: ts.Expression): boolean {
  const parent = node.parent;
  if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isVariableDeclaration(parent)) return parent.initializer === node && parent.type !== undefined;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) return false;
  if (ts.isTypeQueryNode(parent) || ts.isQualifiedName(parent) || ts.isBindingElement(parent)) return false;
  if (ts.isParenthesizedExpression(parent) || ts.isNonNullExpression(parent)) return isEscape(parent);
  return (
    ts.isCallExpression(parent) || ts.isNewExpression(parent) || ts.isSpreadElement(parent) || ts.isSpreadAssignment(parent) ||
    ts.isReturnStatement(parent) || ts.isPropertyAssignment(parent) || ts.isShorthandPropertyAssignment(parent) ||
    ts.isArrayLiteralExpression(parent) || ts.isBinaryExpression(parent) || ts.isConditionalExpression(parent) ||
    ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent) || ts.isExportAssignment(parent) || ts.isArrowFunction(parent)
  );
}
