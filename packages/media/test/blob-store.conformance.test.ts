import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { afterAll, beforeAll } from "vitest";
import { accountIdSchema, creatorIdSchema } from "@aiuteur/contract";
import { createR2BlobStore } from "@aiuteur/media";
import type { BlobStore, Scope } from "@aiuteur/store";
import { describeBlobStoreConformance, FakeBlobStore } from "@aiuteur/testing";

// VC4 BlobStore conformance on both adapters. The R2 adapter runs against a real S3-protocol server on loopback
// (VersityGW, a posix-backed S3 gateway; the binary path is S3_GATEWAY_BIN). A missing binary fails the suite, never skips it.
const scope = (): Scope => ({ accountId: accountIdSchema.parse(randomUUID()), creatorId: creatorIdSchema.parse(randomUUID()) });
const freePort = () => new Promise<number>((resolve) => { const s = createServer().listen(0, "127.0.0.1", () => { const port = (s.address() as { port: number }).port; s.close(() => resolve(port)); }); });

let fake: FakeBlobStore;
let gateway: ChildProcess;
let data: string;
let r2: BlobStore;

beforeAll(async () => {
  fake = await FakeBlobStore.start({ clock: { now: () => Date.now() } });
  const bin = process.env["S3_GATEWAY_BIN"];
  if (!bin) throw new Error("S3_GATEWAY_BIN required: the S3-protocol gateway the R2 adapter conformance runs against (see change-records/T0-12.md)");
  data = mkdtempSync(join(tmpdir(), "s3-gateway-"));
  const bucket = "aiuteur-conformance";
  mkdirSync(join(data, bucket));
  const port = await freePort();
  const [accessKeyId, secretAccessKey] = [randomBytes(8).toString("hex"), randomBytes(24).toString("hex")];
  gateway = spawn(bin, ["--port", `127.0.0.1:${port}`, "--access", accessKeyId, "--secret", secretAccessKey, "--region", "auto", "posix", data], { stdio: "ignore" });
  const endpoint = `http://127.0.0.1:${port}`;
  for (let i = 0; ; i++) {
    if (await fetch(endpoint).then(() => true, () => false)) break;
    if (i > 100) throw new Error("the S3 gateway did not start");
    await setTimeout(100);
  }
  r2 = createR2BlobStore({ endpoint, bucket, accessKeyId, secretAccessKey });
}, 30_000);
afterAll(async () => { await fake?.close(); gateway?.kill(); if (data) rmSync(data, { recursive: true, force: true }); });

describeBlobStoreConformance("in-memory fake with loopback signed URLs", async () => ({ blob: fake, a: scope(), b: scope() }));
describeBlobStoreConformance("R2 adapter over the S3 protocol", async () => ({ blob: r2, a: scope(), b: scope() }));
