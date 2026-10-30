import { createHash, randomUUID } from "node:crypto";
import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accountIdSchema, creatorIdSchema, projectIdSchema, type ProjectId } from "@aiuteur/contract";
import { createMedia, keys } from "@aiuteur/media";
import { deletableKey, ownsKey, type Scope } from "@aiuteur/store";
import { FakeBlobStore, ManualClock, MemoryStore, syntheticImage, uuidv7 } from "@aiuteur/testing";

const scopeOf = (account: string): Scope => ({ accountId: accountIdSchema.parse(account), creatorId: creatorIdSchema.parse(randomUUID()) });

describe("R17: storage keys are built only by media, from a Scope, and name exactly one Account and one project", () => {
  const uuid4 = fc.uuid({ version: 4 });
  const uuid7 = fc.uuid({ version: 7 });
  const hash = fc.stringMatching(/^[0-9a-f]{64}$/);
  it("a committed key is the Scope's Account, one project and the hash; it is owned by that Account alone and not deletable", () => {
    fc.assert(fc.property(uuid4, uuid4, uuid7, uuid7, hash, (account, other, project, otherProject, h) => {
      fc.pre(account !== other && project !== otherProject);
      const scope = scopeOf(account);
      const key = keys.committed(scope, projectIdSchema.parse(project), h);
      expect(key).toBe(`a/${account}/p/${project}/m/${h}`);
      expect(ownsKey(scope, key)).toBe(true);
      expect(ownsKey(scopeOf(other), key)).toBe(false);
      expect(deletableKey(key)).toBe(false);
      // Project separability: no key of one (Account, project) lies under the prefix of another.
      const elsewhere = [keys.committed(scopeOf(other), projectIdSchema.parse(project), h), keys.committed(scope, projectIdSchema.parse(otherProject), h)];
      for (const k of elsewhere) expect(k.startsWith(`a/${account}/p/${project}/`)).toBe(false);
    }));
  });
  it("a staging key is deletable, inside the same project prefix, and differs per upload", () => {
    fc.assert(fc.property(uuid4, uuid7, uuid7, uuid7, (account, project, u1, u2) => {
      fc.pre(u1 !== u2);
      const scope = scopeOf(account);
      const p = projectIdSchema.parse(project);
      const [k1, k2] = [keys.staging(scope, p, u1), keys.staging(scope, p, u2)];
      expect(k1).toBe(`a/${account}/p/${project}/t/${u1}/0`);
      expect(deletableKey(k1) && ownsKey(scope, k1)).toBe(true);
      expect(k1).not.toBe(k2);
    }));
  });
  it("refuses to build a key from anything but well-formed ids and a hash, so no input can add a path segment", () => {
    fc.assert(fc.property(fc.string(), (junk) => {
      fc.pre(!/^[0-9a-f]{64}$/.test(junk));
      const scope = scopeOf(randomUUID());
      const project = projectIdSchema.parse(uuidv7());
      expect(() => keys.committed(scope, project, junk)).toThrow(/storage key/);
      expect(() => keys.staging(scope, project, junk)).toThrow(/storage key/);
      expect(() => keys.committed(scope, junk as ProjectId, "0".repeat(64))).toThrow(/storage key/);
    }));
    for (const evil of [`${uuidv7()}/../x`, "../..", `${"0".repeat(64)}/x`]) expect(() => keys.committed(scopeOf(randomUUID()), projectIdSchema.parse(uuidv7()), evil)).toThrow(/storage key/);
  });
});

describe("media.put and media.access", () => {
  const clock = new ManualClock(Date.parse("2026-10-30T10:00:00Z"));
  const ids = { uuid: randomUUID, ordered: uuidv7, token: () => randomUUID() };
  const [a, b] = [scopeOf(randomUUID()), scopeOf(randomUUID())];
  const project = projectIdSchema.parse(uuidv7());
  let blob: FakeBlobStore;
  let store: MemoryStore;
  let media: ReturnType<typeof createMedia>;
  beforeAll(async () => {
    blob = await FakeBlobStore.start({ clock });
    store = new MemoryStore([a, b], clock);
    await store.write(a, (tx) => tx.insertProject({ projectId: project, createdAt: new Date(clock.now()).toISOString() }));
    media = createMedia({ blob, clock, ids, maxBytes: 4096, seconds: { view: 3600, download: 300, upload: 600 } });
  });
  afterAll(() => blob?.close());

  /** The browser's path: ask for an upload, PUT the bytes to the signed URL, then ingest. */
  async function upload(bytes: Uint8Array, contentType: string, scope = a) {
    const ticket = await store.read(scope, (tx) => media.upload(tx, scope, project));
    if (!ticket) throw new Error("no upload");
    expect(ticket.link).toMatchObject({ purpose: "upload", expiresAt: new Date(clock.now() + 600_000).toISOString() });
    const put = await fetch(ticket.link.url, { method: "PUT", body: new Uint8Array(bytes), headers: { "content-type": contentType } });
    expect(put.status).toBe(200);
    return ticket.uploadId;
  }
  const ingest = (uploadId: string, scope = a) => store.write(scope, (tx) => media.put(tx, scope, project, { kind: "upload", uploadId }));
  const rows = (hash: string) => store.read(a, (tx) => tx.media(project, hash));

  it("fetches, verifies, hashes and probes an upload, promotes it to m/<hash>, and drops staging", async () => {
    const bytes = syntheticImage({ width: 40, height: 30, format: "png" });
    const hash = createHash("sha256").update(bytes).digest("hex");
    const uploadId = await upload(bytes, "image/png");
    const result = await ingest(uploadId);
    expect(result).toEqual({ result: "put", ref: { projectId: project, hash }, media: { hash, size: bytes.byteLength, contentType: "image/png", width: 40, height: 30 } });
    expect(await rows(hash)).toMatchObject({ key: `a/${a.accountId}/p/${project}/m/${hash}`, origin: "upload" });
    expect(Buffer.from((await blob.get(a, `a/${a.accountId}/p/${project}/m/${hash}`))!).equals(Buffer.from(bytes))).toBe(true);
    expect(await blob.head(a, keys.staging(a, project, uploadId))).toBeNull();
    // Identical bytes again: the same Media, no second row.
    expect(await ingest(await upload(bytes, "image/png"))).toEqual(result);
  });

  it("refuses what does not verify, records nothing, and leaves no staging object behind", async () => {
    const png = syntheticImage({ width: 8, height: 8, format: "png", colour: "blue" });
    const jpeg = syntheticImage({ width: 8, height: 8, format: "mjpeg" });
    const cases: [string, () => Promise<string>][] = [
      ["upload-missing", async () => uuidv7()],
      ["empty", () => upload(new Uint8Array(), "image/png")],
      ["too-large", () => upload(syntheticImage({ width: 400, height: 400, format: "png" }), "image/png")],
      ["undecodable", () => upload(Uint8Array.from({ length: 300 }, (_, i) => i % 256), "image/png")],
      ["undecodable", () => upload(png.slice(0, png.length - 30), "image/png")],
      ["type-mismatch", () => upload(jpeg, "image/png")],
    ];
    for (const [reason, make] of cases) {
      const uploadId = await make();
      expect(await ingest(uploadId), reason).toEqual({ result: "refused", reason });
      expect(await blob.head(a, keys.staging(a, project, uploadId)), reason).toBeNull();
    }
    expect(await rows(createHash("sha256").update(jpeg).digest("hex"))).toBeNull();
  });

  it("access signs the stored key for exactly that Media; another Account or project gets nothing", async () => {
    const bytes = syntheticImage({ width: 16, height: 9, format: "webp" });
    const put = await ingest(await upload(bytes, "image/webp"));
    if (put.result !== "put") throw new Error("not put");
    const link = await store.read(a, (tx) => media.access(tx, a, put.ref, "view"));
    expect(link).toMatchObject({ purpose: "view", expiresAt: new Date(clock.now() + 3_600_000).toISOString() });
    const response = await fetch(link!.url);
    expect([response.status, response.headers.get("content-type"), response.headers.get("cache-control")]).toEqual([200, "image/webp", "private"]);
    expect(Buffer.from(await response.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);
    const download = await store.read(a, (tx) => media.access(tx, a, put.ref, "download"));
    expect((await fetch(download!.url)).headers.get("content-disposition")).toBe("attachment");
    // Account B holding A's ref, and A naming the hash in a project it does not hold it in.
    expect(await store.read(b, (tx) => media.access(tx, b, put.ref, "view"))).toBeNull();
    expect(await store.read(a, (tx) => media.access(tx, a, { projectId: projectIdSchema.parse(uuidv7()), hash: put.ref.hash }, "view"))).toBeNull();
    // An upload for a project the Scope does not have is refused before any key is minted.
    expect(await store.read(b, (tx) => media.upload(tx, b, project))).toBeNull();
    // The link expires with the clock.
    clock.advance(3_600_001);
    expect((await fetch(link!.url)).status).toBe(403);
  });
});
