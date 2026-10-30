import { AwsClient } from "aws4fetch";
import { BlobKeyRefused, deletableKey, ownsKey, type BlobHead, type BlobStore, type Scope, type SignRequest } from "@aiuteur/store";

// The production BlobStore adapter (RUNTIME-PLATFORM §1: Cloudflare R2, private bucket). R2 speaks the S3 API, so the
// adapter signs plain S3 requests (SigV4, region `auto`, path-style); no vendor SDK. Presigned URLs work only on the
// storage host (PERSISTENCE §13 P5) and are signed with the app credential; the key is built only by `media` (R17).

export interface R2Config {
  /** The account's S3 endpoint, `https://<account id>.r2.cloudflarestorage.com` (or any S3-compatible endpoint). */
  readonly endpoint: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** SigV4 region; R2 uses `auto`. */
  readonly region?: string;
}

export function createR2BlobStore(config: R2Config): BlobStore {
  const client = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: "s3", region: config.region ?? "auto" });
  const base = config.endpoint.replace(/\/+$/, "");
  const path = (key: string) => `/${encodeURIComponent(config.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const url = (key: string) => `${base}${path(key)}`;
  const guard = (scope: Scope, operation: string, ...keys: string[]) => {
    for (const key of keys) if (!ownsKey(scope, key)) throw new BlobKeyRefused(operation);
  };
  const ok = async (response: Response, operation: string) => {
    if (!response.ok) throw new Error(`blob ${operation} failed with status ${response.status}`);
    await response.body?.cancel();
  };
  return {
    async put(scope, key, bytes, contentType) {
      guard(scope, "put", key);
      await ok(await client.fetch(url(key), { method: "PUT", body: new Uint8Array(bytes), headers: { "content-type": contentType } }), "put");
    },
    async head(scope, key): Promise<BlobHead | null> {
      guard(scope, "head", key);
      const response = await client.fetch(url(key), { method: "HEAD" });
      if (response.status === 404) return null;
      await ok(response, "head");
      return { size: Number(response.headers.get("content-length")), contentType: response.headers.get("content-type") };
    },
    async get(scope, key) {
      guard(scope, "get", key);
      const response = await client.fetch(url(key));
      if (response.status === 404) { await response.body?.cancel(); return null; }
      if (!response.ok) await ok(response, "get");
      return new Uint8Array(await response.arrayBuffer());
    },
    async copy(scope, from, to) {
      guard(scope, "copy", from, to);
      await ok(await client.fetch(url(to), { method: "PUT", headers: { "x-amz-copy-source": path(from) } }), "copy");
    },
    async delete(scope, key) {
      guard(scope, "delete", key);
      if (!deletableKey(key)) throw new BlobKeyRefused("delete");
      await ok(await client.fetch(url(key), { method: "DELETE" }), "delete");
    },
    async sign(scope, key, request: SignRequest) {
      guard(scope, "sign", key);
      const target = new URL(url(key));
      target.searchParams.set("X-Amz-Expires", String(request.expiresInSeconds));
      if (request.response) {
        target.searchParams.set("response-content-type", request.response.contentType);
        target.searchParams.set("response-cache-control", request.response.cacheControl);
        if (request.response.disposition) target.searchParams.set("response-content-disposition", request.response.disposition);
      }
      const signed = await client.sign(target.href, { method: request.method, aws: { signQuery: true } });
      return signed.url;
    },
  };
}
