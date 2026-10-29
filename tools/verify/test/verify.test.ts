import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanSecrets, skipProblems } from "@aiuteur/verify";

// VC1 secret scan and the skipped-check-fails rule. Fixture secrets are built at run time, so this file holds none.
describe("secret scan reads tracked files and names the shape, never the value", () => {
  const files: Record<string, string> = {
    "src/aws.ts": `export const k = "${"AKIA"}${"A".repeat(16)}";\n`,
    "src/key.pem": `-----BEGIN ${"RSA"} PRIVATE KEY-----\n`,
    "src/url.ts": `export const u = "postgres://app:${"hunter2hunter2"}@db.example.com/prod";\n`,
    "src/assigned.ts": `const apiKey = "${"Ab1".repeat(10)}";\n`,
    "src/local.ts": `export const u = "postgres://app:hunter2hunter2@127.0.0.1/test";\n`,
    "src/synthetic.ts": `const secret = "synthetic-test-only-${"x".repeat(30)}";\n`,
  };
  it("flags real shapes and passes loopback URLs and labelled synthetic values", () => {
    const root = mkdtempSync(join(tmpdir(), "secrets-"));
    try {
      for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
      execFileSync("git", ["init", "-q"], { cwd: root });
      execFileSync("git", ["add", "."], { cwd: root });
      const found = scanSecrets(root).map((f) => `${f.path}:${f.shape}`).sort();
      expect(found).toStrictEqual(["src/assigned.ts:assigned secret literal", "src/aws.ts:AWS access key id", "src/key.pem:private key block", "src/url.ts:credential in a connection URL"]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe("a skipped required check fails", () => {
  const ran = (name: string, statuses: string[]) => ({ name: `/r/${name}`, assertionResults: statuses.map((status) => ({ status })) });
  const green = { numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, numTotalTests: 2, testResults: [ran("a.test.ts", ["passed"]), ran("b.test.ts", ["passed"])] };
  const required = ["a.test.ts", "b.test.ts"];
  it("accepts a complete green run", () => expect(skipProblems(green, required)).toStrictEqual([]));
  it("refuses a skipped test, a todo, a failure, an empty run, and a required suite that ran nothing", () => {
    expect(skipProblems({ ...green, numPendingTests: 1 }, required)).toStrictEqual(["1 skipped or pending"]);
    expect(skipProblems({ ...green, numTodoTests: 1 }, required)).toStrictEqual(["1 todo"]);
    expect(skipProblems({ ...green, numFailedTests: 1 }, required)).toStrictEqual(["1 failed"]);
    expect(skipProblems({ ...green, numTotalTests: 0, testResults: [] }, required)).toContain("no tests ran");
    expect(skipProblems({ ...green, testResults: [ran("a.test.ts", ["passed"]), ran("b.test.ts", ["skipped"])] }, required)).toStrictEqual(["required suite b.test.ts ran no passing test"]);
    expect(skipProblems({ ...green, testResults: [ran("a.test.ts", ["passed"])] }, required)).toStrictEqual(["required suite b.test.ts ran no passing test"]);
  });
});
