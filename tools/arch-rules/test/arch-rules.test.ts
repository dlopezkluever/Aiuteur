import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkSources, collectRepositorySources, type SourceFile } from "@aiuteur/arch-rules";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

const violations = (path: string, text: string) => checkSources([{ path, text }]).map((v) => `${v.rule} ${v.path}:${v.line}`);

describe("the repository", () => {
  it("passes R19 and R20", () => {
    const sources: SourceFile[] = collectRepositorySources(repoRoot);
    const paths = sources.map((s) => s.path);
    expect(paths).toContain("packages/testing/src/fake-transport.ts");
    expect(paths).toContain("vitest.config.ts");
    expect(paths.some((p) => p.includes("node_modules/"))).toBe(false);
    expect(checkSources(sources)).toStrictEqual([]);
  });
});

describe("R19: only tests and non-production composition roots import testing/", () => {
  const leaks = [
    `import { FakeTransport } from "@aiuteur/testing";`,
    `import type { FakeControl } from "@aiuteur/testing";`,
    `export { FakeTransport } from "@aiuteur/testing";`,
    `export * from "@aiuteur/testing";`,
    `const t = await import("@aiuteur/testing");`,
    `import { FakeTransport } from "../../testing/src/fake-transport.ts";`,
  ];
  it.each(leaks)("fails a non-test module that does %s", (source) => {
    expect(violations("packages/providers/src/leak.ts", source)).toStrictEqual(["R19 packages/providers/src/leak.ts:1"]);
  });

  it("fails the production composition root", () => {
    expect(violations("apps/server/src/composition/production.ts", leaks[0]!)).toHaveLength(1);
  });

  it.each([
    "packages/providers/test/transport.test.ts",
    "packages/generation/src/dispatch.test.ts",
    "packages/testing/src/conformance/provider-transport.ts",
    "apps/server/src/composition/ci.ts",
  ])("allows %s", (path) => {
    expect(violations(path, leaks[0]!)).toStrictEqual([]);
  });

  it("ignores packages whose names only start like testing", () => {
    expect(violations("packages/providers/src/a.ts", `import x from "@aiuteur/testing-library";`)).toStrictEqual([]);
  });

  it("fails a ProviderTransport implemented outside an adapter or testing/", () => {
    const source = `import type { ProviderTransport } from "@aiuteur/providers";\nexport class Shortcut implements ProviderTransport {}`;
    expect(violations("packages/generation/src/shortcut.ts", source)).toStrictEqual(["R19 packages/generation/src/shortcut.ts:2"]);
    expect(violations("packages/providers/src/adapters/acme-video/transport.ts", source)).toStrictEqual([]);
  });

  it("fails a fake that extends FakeTransport outside testing/", () => {
    const source = `import { FakeTransport } from "@aiuteur/testing";\nclass MyFake extends FakeTransport {}`;
    expect(violations("packages/providers/test/my-fake.test.ts", source)).toStrictEqual(["R19 packages/providers/test/my-fake.test.ts:2"]);
    expect(violations("packages/testing/src/audio-fake.ts", source)).toStrictEqual([]);
  });
});

describe("R20: no module mocking", () => {
  it.each([
    `vi.mock("@aiuteur/providers");`,
    `vi.doMock("../src/index.ts", () => ({}));`,
    `vi.spyOn(providers, "classifyProviderError");`,
    `jest.mock("@aiuteur/providers");`,
    `import { mock } from "node:test";\nmock.module("@aiuteur/providers", {});`,
  ])("fails %s", (source) => {
    expect(violations("packages/providers/test/x.test.ts", source)).toHaveLength(1);
    expect(checkSources([{ path: "packages/providers/test/x.test.ts", text: source }])[0]?.rule).toBe("R20");
  });

  it("allows plain function doubles", () => {
    expect(violations("packages/providers/test/x.test.ts", `const f = vi.fn(); expect(f).not.toHaveBeenCalled();`)).toStrictEqual([]);
  });
});
