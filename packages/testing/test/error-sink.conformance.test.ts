import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, describe, expect, it } from "vitest";
import { createHostedErrorSink, createLogger, createSecretRegistry, type Deployment, type ScrubbedEvent } from "@aiuteur/observability";
import { describeErrorSinkConformance, FakeErrorSink, KNOWN_FILE, type ErrorSinkSubject } from "../src/index.ts";

const deployment: Deployment = { environment: "staging", role: "web", release: `sha256:${"ab".repeat(32)}` };
const KEY = "synthetic-plant-key-0123456789";
const newSecrets = () => createSecretRegistry([KEY]);

describeErrorSinkConformance("FakeErrorSink", async () => new FakeErrorSink(deployment, newSecrets(), { has: (path) => path === KNOWN_FILE }).subject());

// The real adapter posts to an in-process loopback server that records what the wire carried.
const closers: Array<() => void> = [];
afterAll(() => { for (const close of closers) close(); });

async function hostedSubject(): Promise<ErrorSinkSubject> {
  const bodies: string[] = [];
  const headers: Array<Record<string, string | string[] | undefined>> = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => { bodies.push(Buffer.concat(chunks).toString()); headers.push(request.headers); response.end("{}"); });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  closers.push(() => server.close());
  const port = (server.address() as AddressInfo).port;
  const sink = createHostedErrorSink({ ...deployment, dsn: `http://publickey123@127.0.0.1:${port}/42`, secrets: newSecrets(), source: { has: (path) => path === KNOWN_FILE } });
  return {
    sink, deployment, knownFile: KNOWN_FILE,
    wire: async () => [...bodies, ...headers.map((h) => JSON.stringify(h).replace(/publickey123/g, ""))],
    events: async () => bodies.map((body): ScrubbedEvent => {
      const event = JSON.parse(body.split("\n")[2] ?? "{}");
      const { role, code, ...tags } = event.tags as Record<string, string>;
      return {
        errorClass: event.exception.values[0].type, code: code ?? null,
        frames: event.exception.values[0].stacktrace.frames.map((f: { filename: string; lineno: number; colno: number }) => ({ file: f.filename, line: f.lineno, column: f.colno })).reverse(),
        release: event.release, role: role ?? "", environment: event.environment, tags,
      };
    }),
  };
}
describeErrorSinkConformance("hosted adapter", hostedSubject);

describe("hosted adapter specifics", () => {
  it("addresses the project's envelope endpoint with the public key, and refuses a plain-http remote DSN", async () => {
    const subject = await hostedSubject();
    subject.sink.capture(new Error("x"));
    await subject.sink.flush(2_000);
    expect((await subject.events()).length).toBe(1);
    expect(() => createHostedErrorSink({ ...deployment, dsn: "http://k@example.com/1", secrets: newSecrets() })).toThrow(/DSN/);
  });

  it("reports an unreachable tracker as a closed code and still resolves flush", async () => {
    const failures: string[] = [];
    const sink = createHostedErrorSink({ ...deployment, dsn: "http://k@127.0.0.1:9/1", secrets: newSecrets(), onFailure: (code) => failures.push(code) });
    sink.capture(new Error("x"));
    await sink.flush(5_000);
    expect(failures).toEqual(["delivery-failed"]);
  });
});

describe("typed logger and scrubber", () => {
  const lines: string[] = [];
  const secrets = createSecretRegistry([KEY]);
  const log = createLogger({ ...deployment, write: (line) => lines.push(line), clock: { now: () => Date.UTC(2026, 9, 29) }, secrets });

  it("writes one JSON line with the typed fields, the role, the environment and the release", () => {
    log.info("worker.started", { accountId: "acc_1", durationMs: 12, count: 3, code: "ok" });
    expect(JSON.parse(lines.at(-1) ?? "")).toEqual({ time: "2026-10-29T00:00:00.000Z", level: "info", key: "worker.started", ...deployment, accountId: "acc_1", durationMs: 12, count: 3, code: "ok" });
  });

  it("drops what the type forbids but a caller smuggled in, and says how many were dropped", () => {
    log.warn("web.request-failed", { jobId: "job-1", prompt: "a close-up of Mara", requestId: "has spaces and ./slashes", durationMs: -1, code: KEY } as never);
    const line = JSON.parse(lines.at(-1) ?? "");
    // The slug-shaped key survives the shape check and is caught by the registry instead.
    expect(line).toMatchObject({ jobId: "job-1", dropped: 3, code: "[scrubbed]" });
    expect(Object.keys(line)).not.toContain("prompt");
    expect(lines.at(-1)).not.toContain("Mara");
  });

  it("replaces a registered secret that reaches a line through an id-shaped field", () => {
    const late = createSecretRegistry();
    const out: string[] = [];
    const logger = createLogger({ ...deployment, write: (line) => out.push(line), clock: { now: () => 0 }, secrets: late });
    late.add("tok_abcdefgh12345678");
    logger.error("web.request-failed", { requestId: "tok_abcdefgh12345678" });
    expect(out[0]).not.toContain("tok_abcdefgh12345678");
    expect(JSON.parse(out[0] ?? "").requestId).toBe("[scrubbed]");
  });

  it("scrubs a registered secret however short, alone or inside a longer value, and the line stays valid JSON", () => {
    const out: string[] = [];
    const short = createLogger({ ...deployment, write: (line) => out.push(line), clock: { now: () => 0 }, secrets: createSecretRegistry(["abc", undefined, ""]) });
    short.info("web.request-failed", { requestId: "abc" });
    short.info("web.request-failed", { requestId: "xx-abc-yy", jobId: "job-1", code: "abc-failed" });
    for (const line of out) { expect(line).not.toContain("abc"); JSON.parse(line); }
    expect(JSON.parse(out[1] ?? "")).toMatchObject({ requestId: "[scrubbed]", code: "[scrubbed]", jobId: "job-1" });
  });

  it("the hosted sink scrubs a short registered secret from every tag too", async () => {
    const secrets = createSecretRegistry(["abc"]);
    const bodies: string[] = [];
    const sink = createHostedErrorSink({ ...deployment, dsn: "http://k@127.0.0.1:9/1", secrets, fetch: async (_url, init) => { bodies.push(String(init?.body)); return new Response("{}"); } });
    sink.capture(new Error("x"), { requestId: "req-abc-1", code: "abc-failed" });
    await sink.flush(2_000);
    expect(bodies.join("")).not.toContain("abc");
  });
});

describe("the deployed source index", () => {
  it("lists this repository's own source files, not node_modules or invented paths, and reports a real stack against it", async () => {
    const { indexSource, NO_SOURCE } = await import("@aiuteur/observability");
    const { fileURLToPath } = await import("node:url");
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    const index = indexSource(root);
    const own = fileURLToPath(new URL("../../observability/src/error-sink.ts", import.meta.url));
    expect(index.has(own)).toBe(true);
    expect(index.has(`${root}/packages/observability/src/Mara_reads_private_treatment_draft.ts`)).toBe(false);
    expect(index.has(`${root}/node_modules/vitest/package.json`)).toBe(false);
    expect(NO_SOURCE.has(own)).toBe(false);
    const sink = new FakeErrorSink(deployment, newSecrets(), index);
    const error = new Error("x");
    error.stack = `Error: x\n    at run (${own}:10:5)\n    at test (${fileURLToPath(import.meta.url)}:1:1)`; // a test file is not deployed source
    sink.capture(error);
    expect(sink.events[0]?.frames).toEqual([{ file: own, line: 10, column: 5 }, { file: "unknown", line: 1, column: 1 }]);
  });
});
