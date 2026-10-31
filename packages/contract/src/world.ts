import { z } from "zod";
import { REFUSAL_REASONS } from "./history.ts";
import { MEDIA_REFUSALS, mediaFactsSchema } from "./media.ts";
import { objectIdSchema } from "./studio.ts";

// Draft FC2 wire shapes for the T0 hand-made Character (`world`) and Shot (`production`) (T0-12; BUILD-SEQUENCE T0b).
// VS5 and VS6 replace the hand step with the same kinds and commands; they do not migrate it.

const name = z.string().trim().min(1).max(200);
/** `POST …/characters`: a Character added by hand (ENTITIES §2.2a). */
export const createCharacterSchema = z.strictObject({ name });
/** `POST …/uploads`: no body. The type is the PUT's `content-type`, and verification decodes the bytes against it. */
export const requestUploadSchema = z.strictObject({});
/** `POST …/characters/:objectId/reference`: attach a verified upload as the Character's identity image (an upload Attempt). */
export const attachReferenceSchema = z.strictObject({ uploadId: z.uuidv7() });
/** The Look of a Presence. T0 has no Looks yet, so every Presence is the base appearance. */
export const LOOKS = ["base"] as const;
export const presenceSchema = z.strictObject({ entity: objectIdSchema, look: z.enum(LOOKS) });
const presenceListSchema = z.array(presenceSchema).max(50)
  .refine((list) => new Set(list.map((p) => p.entity)).size === list.length, { message: "an entity is present once" });
/** `POST …/shots`: a Shot made by hand, outside any Scene (an ad-hoc Shot, Record 2 X5), with explicit Presences. */
export const createShotSchema = z.strictObject({ action: z.string().max(4000), presence: presenceListSchema });
/** `POST …/shots/:objectId/presence`: change who is present, on the Revision the client last read. */
export const changePresenceSchema = z.strictObject({ base: z.int().min(1), presence: presenceListSchema });

/** The identity image a Character currently shows: its latest upload Attempt, with the frozen facts of its Media. */
export const referenceReadSchema = z.strictObject({ attemptId: z.uuidv7(), media: mediaFactsSchema, createdAt: z.iso.datetime() });
export const characterReadSchema = z.strictObject({
  objectId: objectIdSchema,
  sequence: z.int().min(1),
  name: z.string(),
  reference: referenceReadSchema.nullable(),
  createdAt: z.iso.datetime(),
});
export type CharacterRead = z.infer<typeof characterReadSchema>;
export const characterListSchema = z.strictObject({ characters: z.array(characterReadSchema) });
export type CharacterList = z.infer<typeof characterListSchema>;

/** A Presence as read: the entity's current name beside the stored reference (names are never copied into the Shot). */
export const presenceReadSchema = z.strictObject({ entity: objectIdSchema, look: z.enum(LOOKS), name: z.string() });
export const shotReadSchema = z.strictObject({
  objectId: objectIdSchema,
  sequence: z.int().min(1),
  action: z.string(),
  presence: z.array(presenceReadSchema),
  /** Presence bodies kept aside by a stale client (StaleBase), oldest first. */
  sideLine: z.array(z.strictObject({ attemptId: z.uuidv7(), basedOn: z.int().min(0), presence: z.array(presenceReadSchema), createdAt: z.iso.datetime() })),
  createdAt: z.iso.datetime(),
});
export type ShotRead = z.infer<typeof shotReadSchema>;
export const shotListSchema = z.strictObject({ shots: z.array(shotReadSchema) });
export type ShotList = z.infer<typeof shotListSchema>;

/** A write through the gate on a `world` or `production` object: the five results, naming the object and its new head. */
export const entityOutcomeSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("Applied"), appended: z.boolean(), objectId: objectIdSchema, sequence: z.int().min(1) }),
  z.strictObject({ result: z.literal("NeedsConfirmation"), impact: z.strictObject({ version: z.int().min(0), reached: z.array(objectIdSchema) }) }),
  z.strictObject({ result: z.literal("HeldAsOption"), attemptId: z.uuidv7() }),
  z.strictObject({ result: z.literal("StaleBase"), head: z.int().min(0), attemptId: z.uuidv7() }),
  z.strictObject({ result: z.literal("Refused"), reason: z.enum(REFUSAL_REASONS) }),
]);
export type EntityOutcome = z.infer<typeof entityOutcomeSchema>;
/** Attaching a reference: an upload Attempt on the identity-image Slot, or a refusal that recorded nothing. */
export const referenceOutcomeSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("Applied"), reference: referenceReadSchema }),
  z.strictObject({ result: z.literal("NeedsConfirmation"), impact: z.strictObject({ version: z.int().min(0), reached: z.array(objectIdSchema) }) }),
  z.strictObject({ result: z.literal("Refused"), reason: z.enum([...REFUSAL_REASONS, ...MEDIA_REFUSALS]) }),
]);
export type ReferenceOutcome = z.infer<typeof referenceOutcomeSchema>;
