import { setTimeout } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { BlobKeyRefused, type BlobStore, type Scope } from "@aiuteur/store";
import { uuidv7 } from "../uuidv7.ts";

export interface BlobStoreSubject {
  readonly blob: BlobStore;
  /** Two Accounts. Keys are built here by hand on purpose: the suite judges the port, not `media`'s key builder. */
  readonly a: Scope;
  readonly b: Scope;
}

/**
 * VC4 BlobStore conformance (MODULE §11: verify-before-success, key derivation, project separability; PERSISTENCE §7):
 * one suite over the real adapter and the fake. Signed URLs are fetched over HTTP, as a browser would.
 */
export function describeBlobStoreConformance(name: string, subject: () => Promise<BlobStoreSubject>): void {
  describe(`BlobStore conformance: ${name}`, () => {
    const project = () => uuidv7();
    const key = (scope: Scope, p: string, prefix: "m" | "t" | "r" | "x", leaf = uuidv7()) => `a/${scope.accountId}/p/${p}/${prefix}/${leaf}`;
    const bytes = (n: number, seed = 7) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed) % 256);

    it("round trips bytes and content type exactly; an absent key reads as absent", async () => {
      const { blob, a } = await subject();
      const k = key(a, project(), "t");
      const data = bytes(4099);
      await blob.put(a, k, data, "image/png");
      expect(await blob.head(a, k)).toEqual({ size: 4099, contentType: "image/png" });
      expect(Buffer.from((await blob.get(a, k))!).equals(Buffer.from(data))).toBe(true);
      expect(await blob.head(a, key(a, project(), "m"))).toBeNull();
      expect(await blob.get(a, key(a, project(), "m"))).toBeNull();
    });

    it("copies server-side inside the Account and leaves the source as it was", async () => {
      const { blob, a } = await subject();
      const p = project();
      const [from, to] = [key(a, p, "t"), key(a, p, "m")];
      await blob.put(a, from, bytes(10), "image/webp");
      await blob.copy(a, from, to);
      expect(Buffer.from((await blob.get(a, to))!).equals(Buffer.from(bytes(10)))).toBe(true);
      expect(await blob.head(a, to)).toMatchObject({ size: 10 });
      expect(await blob.head(a, from)).toMatchObject({ size: 10 });
    });

    it("refuses every operation on another Account's key, or a key that escapes its prefix, and touches nothing", async () => {
      const { blob, a, b } = await subject();
      const theirs = key(a, project(), "m");
      await blob.put(a, theirs, bytes(5), "image/png");
      const mine = key(b, project(), "t");
      await blob.put(b, mine, bytes(3), "image/png");
      const escapes = [`a/${b.accountId}/../${theirs}`, `a/${b.accountId}//x`, `a/${b.accountId}/./p`];
      for (const k of [theirs, ...escapes]) {
        await expect(blob.head(b, k)).rejects.toBeInstanceOf(BlobKeyRefused);
        await expect(blob.get(b, k)).rejects.toBeInstanceOf(BlobKeyRefused);
        await expect(blob.put(b, k, bytes(1), "image/png")).rejects.toBeInstanceOf(BlobKeyRefused);
        await expect(blob.sign(b, k, { method: "GET", expiresInSeconds: 60 })).rejects.toBeInstanceOf(BlobKeyRefused);
        await expect(blob.copy(b, k, mine)).rejects.toBeInstanceOf(BlobKeyRefused);
        await expect(blob.copy(b, mine, k)).rejects.toBeInstanceOf(BlobKeyRefused);
      }
      await expect(blob.delete(b, key(a, project(), "t"))).rejects.toBeInstanceOf(BlobKeyRefused);
      expect(Buffer.from((await blob.get(a, theirs))!).equals(Buffer.from(bytes(5)))).toBe(true);
    });

    it("R16: deletes staging, rendition and export objects, and refuses committed Media under m/", async () => {
      const { blob, a } = await subject();
      const p = project();
      for (const prefix of ["t", "r", "x"] as const) {
        const k = key(a, p, prefix);
        await blob.put(a, k, bytes(2), "image/png");
        await blob.delete(a, k);
        expect(await blob.head(a, k), prefix).toBeNull();
      }
      const committed = key(a, p, "m");
      await blob.put(a, committed, bytes(2), "image/png");
      await expect(blob.delete(a, committed)).rejects.toBeInstanceOf(BlobKeyRefused);
      await expect(blob.delete(a, `a/${a.accountId}/l/${uuidv7()}`)).rejects.toBeInstanceOf(BlobKeyRefused);
      expect(await blob.head(a, committed)).toMatchObject({ size: 2 });
    });

    it("a signed GET serves exactly its key with the signed headers; tampering, method change and no signature are refused", async () => {
      const { blob, a } = await subject();
      const p = project();
      const [k, other] = [key(a, p, "m"), key(a, p, "m")];
      await blob.put(a, k, bytes(64), "application/octet-stream");
      await blob.put(a, other, bytes(64, 9), "application/octet-stream");
      const url = await blob.sign(a, k, { method: "GET", expiresInSeconds: 120, response: { contentType: "image/png", cacheControl: "private" } });
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(response.headers.get("cache-control")).toBe("private");
      expect(Buffer.from(await response.arrayBuffer()).equals(Buffer.from(bytes(64)))).toBe(true);
      // The same signature on a guessed neighbouring key, with a changed header, for a write, or with none at all.
      const swapped = url.replace(k.split("/").at(-1)!, other.split("/").at(-1)!);
      const restyled = url.replace(encodeURIComponent("image/png"), encodeURIComponent("text/html"));
      const unsigned = url.split("?")[0]!;
      for (const [label, target, init] of [["swapped", swapped, {}], ["restyled", restyled, {}], ["unsigned", unsigned, {}], ["as PUT", url, { method: "PUT", body: "x" }]] as const) {
        const refused = await fetch(target, init);
        await refused.body?.cancel();
        expect(refused.status, label).toBe(403);
      }
    });

    it("a signed PUT fills exactly its key; it cannot be read back with its own signature", async () => {
      const { blob, a } = await subject();
      const k = key(a, project(), "t");
      const url = await blob.sign(a, k, { method: "PUT", expiresInSeconds: 120 });
      const put = await fetch(url, { method: "PUT", body: bytes(33), headers: { "content-type": "image/jpeg" } });
      await put.body?.cancel();
      expect(put.status).toBe(200);
      expect(await blob.head(a, k)).toEqual({ size: 33, contentType: "image/jpeg" });
      const get = await fetch(url);
      await get.body?.cancel();
      expect(get.status).toBe(403);
    });

    it("a signed URL stops working when it expires", async () => {
      const { blob, a } = await subject();
      const k = key(a, project(), "m");
      await blob.put(a, k, bytes(8), "image/png");
      const url = await blob.sign(a, k, { method: "GET", expiresInSeconds: 1 });
      const fresh = await fetch(url);
      await fresh.body?.cancel();
      expect(fresh.status).toBe(200);
      await setTimeout(2_200);
      const stale = await fetch(url);
      await stale.body?.cancel();
      expect(stale.status).toBe(403);
    });
  });
}
