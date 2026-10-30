import { z } from "zod";

// Draft FC2 wire shapes for private media (T0-12; PERSISTENCE-AND-MEDIA §7). `MediaRef` itself is FC5 and lives in `media`.

/** What a signed link is for (PERSISTENCE §7.3): exactly one key, short-lived. */
export const MEDIA_PURPOSES = ["view", "download", "upload"] as const;
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];
/** How committed Media came to exist (PERSISTENCE §7.1). T0-12 ingests uploads only; the other origins arrive with their ingest. */
export const MEDIA_ORIGINS = ["upload"] as const;
export type MediaOrigin = (typeof MEDIA_ORIGINS)[number];
/** The image types a reference upload may declare; verification decodes the bytes and refuses a mismatch. */
export const REFERENCE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ReferenceImageType = (typeof REFERENCE_IMAGE_TYPES)[number];
/** Why `media.put` refused bytes (verify before success, PERSISTENCE §7.2). Nothing is recorded on a refusal. */
export const MEDIA_REFUSALS = ["upload-missing", "empty", "too-large", "undecodable", "type-mismatch"] as const;
export type MediaRefusal = (typeof MEDIA_REFUSALS)[number];

/** SHA-256 of the bytes, lowercase hex: the content address of a Media inside its project. */
export const mediaHashSchema = z.string().regex(/^[0-9a-f]{64}$/);
/** Probe facts frozen at ingest, as a reader may see them. */
export const mediaFactsSchema = z.strictObject({
  hash: mediaHashSchema,
  size: z.int().positive(),
  contentType: z.enum(REFERENCE_IMAGE_TYPES),
  width: z.int().positive(),
  height: z.int().positive(),
});
export type MediaFacts = z.infer<typeof mediaFactsSchema>;
/** A short-lived signed URL for exactly one key (`media.access`). Never stored and never logged. */
export const mediaLinkSchema = z.strictObject({ url: z.url(), purpose: z.enum(MEDIA_PURPOSES), expiresAt: z.iso.datetime() });
export type MediaLink = z.infer<typeof mediaLinkSchema>;
/** `POST …/uploads`: a staging key for one upload and the signed PUT that fills it. */
export const uploadSchema = z.strictObject({ uploadId: z.uuidv7(), link: mediaLinkSchema });
export type Upload = z.infer<typeof uploadSchema>;
