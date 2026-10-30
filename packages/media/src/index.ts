import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { REFERENCE_IMAGE_TYPES, type MediaFacts, type MediaLink, type MediaPurpose, type MediaRefusal, type ProjectId, type ReferenceImageType, type Upload } from "@aiuteur/contract";
import type { BlobStore, Clock, Ids, MediaRow, ReadTx, Scope, WriteTx } from "@aiuteur/store";

export { createR2BlobStore, type R2Config } from "./r2.ts";

// `media` (MODULE §3.4; PERSISTENCE §7): private, content-addressed Media. Nothing outside this module holds a BlobStore
// or builds a storage key (R16, R17), and every call takes a Scope.

/** FC5 Draft: a reference to one committed Media, meaningful only inside its project and only under a Scope that owns it. */
export interface MediaRef { readonly projectId: ProjectId; readonly hash: string }
/** Where an ingest reads its bytes from. T0-12 ingests creator uploads; provider outputs join with the first Frame (T0-13). */
export type MediaSource = { readonly kind: "upload"; readonly uploadId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH = /^[0-9a-f]{64}$/;
const segment = (value: string, pattern: RegExp, what: string) => {
  if (!pattern.test(value)) throw new Error(`not a ${what}: refusing to build a storage key`);
  return value;
};
/**
 * The only key builder (R17). A key names the Scope's Account and exactly one project, and is built from the Scope,
 * never from a client: `a/<account>/p/<project>/m/<hash>` for committed Media, `…/t/<upload>/0` for staging.
 */
export const keys = {
  committed: (scope: Scope, projectId: ProjectId, hash: string) =>
    `a/${segment(scope.accountId, UUID, "Account id")}/p/${segment(projectId, UUID, "project id")}/m/${segment(hash, HASH, "content hash")}`,
  staging: (scope: Scope, projectId: ProjectId, uploadId: string) =>
    `a/${segment(scope.accountId, UUID, "Account id")}/p/${segment(projectId, UUID, "project id")}/t/${segment(uploadId, UUID, "upload id")}/0`,
};

const run = promisify(execFile);
/** What probing found in bytes, or null when they do not decode as one supported still image. */
export type Probe = (bytes: Uint8Array) => Promise<{ readonly contentType: ReferenceImageType; readonly width: number; readonly height: number } | null>;
const CODECS: Readonly<Record<string, ReferenceImageType>> = { png: "image/png", mjpeg: "image/jpeg", webp: "image/webp" };
/** Probes with ffprobe and decodes the whole image with ffmpeg (verify before success: container decode, dimensions). */
export const ffprobe: Probe = async (bytes) => {
  const dir = await mkdtemp(join(tmpdir(), "media-probe-"));
  try {
    const path = join(dir, "input");
    await writeFile(path, bytes);
    const probed = await run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height", "-of", "json", path]).catch(() => null);
    const streams = probed ? (JSON.parse(probed.stdout) as { streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number }[] }).streams ?? [] : [];
    const [stream] = streams;
    const contentType = stream?.codec_name === undefined ? undefined : CODECS[stream.codec_name];
    if (streams.length !== 1 || stream?.codec_type !== "video" || !contentType || !stream.width || !stream.height) return null;
    const decoded = await run("ffmpeg", ["-v", "error", "-xerror", "-i", path, "-f", "null", "-"]).then((r) => r.stderr.trim() === "", () => false);
    return decoded ? { contentType, width: stream.width, height: stream.height } : null;
  } finally { await rm(dir, { recursive: true, force: true }); }
};

export interface MediaOptions {
  readonly blob: BlobStore;
  readonly clock: Clock;
  readonly ids: Ids;
  /** The size cap an upload is verified against (a signed PUT cannot cap size, PERSISTENCE §7.2). */
  readonly maxBytes: number;
  /** Signed-URL lifetimes (PERSISTENCE §7.3, tuning defaults set at the composition root). */
  readonly seconds: Readonly<Record<MediaPurpose, number>>;
  readonly probe?: Probe;
}
export type PutResult =
  | { readonly result: "put"; readonly ref: MediaRef; readonly media: MediaFacts }
  | { readonly result: "refused"; readonly reason: MediaRefusal };

export const facts = (row: MediaRow): MediaFacts => ({ hash: row.hash, size: row.size, contentType: row.contentType as ReferenceImageType, width: row.width, height: row.height });

export function createMedia(options: MediaOptions) {
  const { blob, clock, ids } = options;
  const probe = options.probe ?? ffprobe;
  const link = async (scope: Scope, key: string, purpose: MediaPurpose, response?: { contentType: string; cacheControl: string; disposition?: string }): Promise<MediaLink> => {
    const seconds = options.seconds[purpose];
    const url = await blob.sign(scope, key, { method: purpose === "upload" ? "PUT" : "GET", expiresInSeconds: seconds, ...(response ? { response } : {}) });
    return { url, purpose, expiresAt: new Date(clock.now() + seconds * 1000).toISOString() };
  };
  return {
    /** A staging key for one upload and the signed PUT that fills it, or null when the Scope has no such project. */
    async upload(rtx: ReadTx, scope: Scope, projectId: ProjectId): Promise<Upload | null> {
      if (!await rtx.project(projectId)) return null;
      const uploadId = ids.ordered();
      return { uploadId, link: await link(scope, keys.staging(scope, projectId, uploadId), "upload") };
    },
    /**
     * `media.put` (PERSISTENCE §7.2): fetch the staged bytes, verify (present, non-empty, under the cap, decodes as the
     * declared type), hash, probe, promote to `m/<hash>` by server-side copy, drop the staging object, then record the
     * Media row in the caller's transaction, which must add its first referrer. Identical bytes already in the project
     * reuse the row. A refusal records nothing.
     */
    async put(wtx: WriteTx, scope: Scope, projectId: ProjectId, source: MediaSource): Promise<PutResult> {
      const staging = keys.staging(scope, projectId, source.uploadId);
      const refuse = async (reason: MediaRefusal): Promise<PutResult> => {
        if (reason !== "upload-missing") await blob.delete(scope, staging);
        return { result: "refused", reason };
      };
      const head = await blob.head(scope, staging);
      if (!head) return refuse("upload-missing");
      if (head.size === 0) return refuse("empty");
      if (head.size > options.maxBytes) return refuse("too-large");
      const bytes = await blob.get(scope, staging);
      if (!bytes) return refuse("upload-missing");
      if (bytes.byteLength === 0) return refuse("empty");
      if (bytes.byteLength > options.maxBytes) return refuse("too-large");
      const probed = await probe(bytes);
      if (!probed) return refuse("undecodable");
      if (head.contentType !== probed.contentType || !(REFERENCE_IMAGE_TYPES as readonly string[]).includes(head.contentType)) return refuse("type-mismatch");
      const hash = createHash("sha256").update(bytes).digest("hex");
      const key = keys.committed(scope, projectId, hash);
      if (!await blob.head(scope, key)) await blob.copy(scope, staging, key);
      await blob.delete(scope, staging);
      const existing = await wtx.media(projectId, hash);
      const row: MediaRow = existing ?? { projectId, hash, size: bytes.byteLength, contentType: probed.contentType, width: probed.width, height: probed.height, key, origin: "upload", createdAt: new Date(clock.now()).toISOString() };
      if (!existing) await wtx.insertMedia(row);
      return { result: "put", ref: { projectId, hash }, media: facts(row) };
    },
    /**
     * `media.access` (PERSISTENCE §7.3): reads the Media row under the Scope and signs the key stored on it, for exactly
     * that key and a short life. Null when the Scope cannot see the Media: another Account's ref answers as an absent one.
     */
    async access(rtx: ReadTx, scope: Scope, ref: MediaRef, purpose: Exclude<MediaPurpose, "upload">): Promise<MediaLink | null> {
      const row = await rtx.media(ref.projectId, ref.hash);
      if (!row) return null;
      return link(scope, row.key, purpose, { contentType: row.contentType, cacheControl: "private", ...(purpose === "download" ? { disposition: "attachment" } : {}) });
    },
  };
}
export type Media = ReturnType<typeof createMedia>;
