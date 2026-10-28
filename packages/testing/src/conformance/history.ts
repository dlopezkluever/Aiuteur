import { createHash, randomUUID } from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { actionGroupIdSchema, generationIdSchema, objectIdSchema, projectIdSchema, type ObjectId, type ProjectId } from "@aiuteur/contract";
import { createHistory, derive, read, type CommitContext, type CommitResult } from "@aiuteur/history";
import type { Scope } from "@aiuteur/store";
import { sourceMaterialKind } from "@aiuteur/story";
import { uuidv7 } from "../uuidv7.ts";
import type { StoreSubject } from "./store.ts";

const ids = { uuid: randomUUID, ordered: uuidv7, token: randomUUID };
let tick = Date.UTC(2026, 0, 1);
const context = (extra: Partial<CommitContext> = {}): CommitContext => ({ actor: "creator", cause: "import", actionGroup: actionGroupIdSchema.parse(uuidv7()), at: (tick += 1000), ids, ...extra });
const gen = () => generationIdSchema.parse(uuidv7());
const KIND = sourceMaterialKind.kind;
/** Composition registers the owning module's declaration, as production does. */
const { commit } = createHistory([sourceMaterialKind]);

/** Draft FC3 conformance: the write gate must behave identically on every Store. */
export function describeHistoryConformance(name: string, subject: () => Promise<StoreSubject>): void {
  describe(`History conformance: ${name}`, () => {
    async function setup() {
      const s = await subject();
      const projectId = projectIdSchema.parse(uuidv7());
      await s.store.write(s.a, (tx) => tx.insertProject({ projectId, createdAt: new Date(tick).toISOString() }));
      const write = (scope: Scope, objectId: ObjectId, base: number, text: string, extra: Partial<CommitContext> = {}, project: ProjectId = projectId, role: "primary" | "supporting" = "primary") =>
        s.store.write(scope, (tx) => commit(tx, scope, { kind: KIND, projectId: project, objectId, base, body: { text, role } }, context(extra)));
      const newObject = async (text = "first") => {
        const objectId = objectIdSchema.parse(uuidv7());
        expect(await write(s.a, objectId, 0, text)).toMatchObject({ result: "Applied", appended: true });
        return objectId;
      };
      const read_ = (scope: Scope, objectId: ObjectId, sequence?: number) => s.store.read(scope, (tx) => read(tx, scope, objectId, sequence));
      return { ...s, projectId, write, newObject, read: read_ };
    }

    it("reads a pasted original back byte-identical, however odd its characters", async () => {
      const { write, read: readBack, a } = await setup();
      const texts = ["Hello", "a\r\nb\n\n  trailing  \t", "emoji 🎬 \u2028 \u00a0 \ufeff end", "{\"json\": [1, 2], \"k\": null}", " ", "\\n \\u0000 literal backslashes"];
      for (const text of texts) {
        const objectId = objectIdSchema.parse(uuidv7());
        expect(await write(a, objectId, 0, text)).toMatchObject({ result: "Applied" });
        expect((await readBack(a, objectId))?.head.body).toEqual({ text, role: "primary" });
      }
      await fc.assert(fc.asyncProperty(fc.string({ unit: "grapheme", minLength: 1 }).filter((text) => !text.includes("\u0000")), async (text) => {
        const objectId = objectIdSchema.parse(uuidv7());
        expect(await write(a, objectId, 0, text)).toMatchObject({ result: "Applied" });
        expect((await readBack(a, objectId))?.head.body).toEqual({ text, role: "primary" });
      }), { numRuns: 15 });
    });

    it("a stale base returns StaleBase, keeps the winner as head and keeps the loser on a side line", async () => {
      const { write, newObject, read: readBack, a } = await setup();
      const objectId = await newObject("original");
      expect(await write(a, objectId, 1, "original", {}, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 2 } });
      const stale = await write(a, objectId, 1, "original", {}, undefined, "primary");
      expect(stale).toMatchObject({ result: "StaleBase", head: 2 });
      const found = await readBack(a, objectId);
      expect(found?.head).toMatchObject({ sequence: 2, body: { text: "original", role: "supporting" } });
      expect(found?.sequences).toEqual([1, 2]);
      expect(found?.sideLine).toMatchObject([{ attemptId: stale.result === "StaleBase" ? stale.attemptId : "", basedOn: 1, origin: "stale-base", body: { text: "original", role: "primary" } }]);
    });

    it("concurrent commits from one base produce one winner; every other is StaleBase and kept", async () => {
      const { write, newObject, read: readBack, a } = await setup();
      const objectId = await newObject();
      // Eight identical real changes from base 1: whichever runs first wins, the other seven are stale.
      const results = await Promise.all(Array.from({ length: 8 }, () => write(a, objectId, 1, "first", {}, undefined, "supporting")));
      const applied = results.flatMap((result, index) => result.result === "Applied" && result.appended ? [index] : []);
      expect(applied).toHaveLength(1);
      expect(results.filter((result) => result.result === "StaleBase")).toHaveLength(7);
      const found = await readBack(a, objectId);
      expect(found?.sequences).toEqual([1, 2]);
      expect(found?.head.body).toEqual({ text: "first", role: "supporting" });
      expect(found?.sideLine).toHaveLength(7);
      expect(found?.sideLine.every((entry) => entry.origin === "stale-base" && entry.basedOn === 1)).toBe(true);
      // Two pastes racing to create the same object: one creates it, the other is stale at base 0.
      const created = objectIdSchema.parse(uuidv7());
      const race = await Promise.all([write(a, created, 0, "x"), write(a, created, 0, "y")]);
      expect(race.map((result) => result.result).sort()).toEqual(["Applied", "StaleBase"]);
    });

    it("refuses any change to the supplied text through the gate, whoever calls it, and leaves head and content unchanged", async () => {
      const { write, newObject, read: readBack, rowCounts, store, a, projectId } = await setup();
      const objectId = await newObject("the original");
      const head = (await readBack(a, objectId))?.head;
      const before = await rowCounts();
      expect(await write(a, objectId, 1, "the original, edited")).toMatchObject({ result: "Refused", reason: "invariant-violated" });
      expect(await write(a, objectId, 1, "THE ORIGINAL", { actor: "generation", generationId: gen() })).toMatchObject({ result: "Refused", reason: "invariant-violated" });
      expect(await write(a, objectId, 1, "the original ", {}, undefined, "supporting")).toMatchObject({ result: "Refused", reason: "invariant-violated" });
      expect(await rowCounts()).toEqual(before);
      expect((await readBack(a, objectId))?.head).toEqual(head);
      // The descriptor may change; the text is carried over untouched.
      expect(await write(a, objectId, 1, "the original", {}, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true });
      // A body derived from the head inside the gate keeps the text even when the base is stale.
      const derived = await store.write(a, (tx) => commit(tx, a, { kind: KIND, projectId, objectId, base: 1, body: (current: unknown) => { const head = sourceMaterialKind.parse(current); return head && { text: head.text, role: "primary" }; } }, context()));
      expect(derived).toMatchObject({ result: "StaleBase", head: 2 });
      expect((await readBack(a, objectId))?.sideLine).toMatchObject([{ body: { text: "the original", role: "primary" } }]);
    });

    it("a caller cannot supply the rules: a kind that is not registered is refused, and the head and content stay unchanged", async () => {
      const { write, newObject, read: readBack, rowCounts, store, a, projectId } = await setup();
      const objectId = await newObject("registered rules only");
      const head = (await readBack(a, objectId))?.head;
      const before = await rowCounts();
      const body = { text: "changed by a caller-built kind", role: "primary" };
      // The original bypass: the old Change carried a whole declaration with its invariants removed.
      const forged = { ...sourceMaterialKind, invariants: [] };
      expect(await store.write(a, (tx) => commit(tx, a, { kind: forged as never, projectId, objectId, base: 1, body }, context()))).toMatchObject({ result: "Refused", reason: "unknown-kind" });
      expect(await store.write(a, (tx) => commit(tx, a, { kind: "not-registered", projectId, objectId, base: 1, body }, context()))).toMatchObject({ result: "Refused", reason: "unknown-kind" });
      expect(await rowCounts()).toEqual(before);
      expect((await readBack(a, objectId))?.head).toEqual(head);
      // The legitimate descriptor change through the registered kind still works.
      expect(await write(a, objectId, 1, "registered rules only", {}, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true });
      expect(() => createHistory([sourceMaterialKind, sourceMaterialKind])).toThrow("registered twice");
    });

    it("LINEAGE §1: every appended Revision carries its action group; a no-op or a stale loser adds none", async () => {
      const { write, newObject, read: readBack, a } = await setup();
      const objectId = await newObject("grouped");
      const group = actionGroupIdSchema.parse(uuidv7());
      expect(await write(a, objectId, 1, "grouped", { actionGroup: group }, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true, revision: { actionGroup: group } });
      const found = await readBack(a, objectId);
      expect(found?.head.actionGroup).toBe(group);
      expect((await readBack(a, objectId, 1))?.revision?.actionGroup).not.toBe(group);
      const other = actionGroupIdSchema.parse(uuidv7());
      // A save equal to the head is a no-op: it returns the existing Revision and its group, not the new one.
      expect(await write(a, objectId, 2, "grouped", { actionGroup: other }, undefined, "supporting")).toMatchObject({ result: "Applied", appended: false, revision: { sequence: 2, actionGroup: group } });
      expect(await write(a, objectId, 1, "grouped", { actionGroup: other }, undefined, "primary")).toMatchObject({ result: "StaleBase" });
      expect((await readBack(a, objectId))?.sequences).toEqual([1, 2]);
    });

    it("MODULE §5.1 (4): AI-made content without a Generation is refused before anything is stored; valid provenance is kept", async () => {
      const { write, newObject, read: readBack, rowCounts, lockObject, a } = await setup();
      const objectId = await newObject("ai target");
      const head = (await readBack(a, objectId))?.head;
      const before = await rowCounts();
      const refused = { result: "Refused", reason: "missing-provenance" };
      expect(await write(a, objectId, 1, "ai target", { actor: "generation", cause: "ai_generation" }, undefined, "supporting")).toMatchObject(refused);
      expect(await write(a, objectId, 1, "ai target", { cause: "ai_generation" }, undefined, "supporting")).toMatchObject(refused);
      expect(await write(a, objectId, 1, "ai target", { actor: "generation", generationId: gen() }, undefined, "supporting")).toMatchObject({ result: "Applied" });
      expect(await write(a, objectId, 1, "ai target", { generationId: gen() }, undefined, "primary")).toMatchObject(refused);
      expect(await rowCounts()).toEqual({ ...before, revision: (before["revision"] ?? 0) + 1 });
      expect((await readBack(a, objectId))?.sideLine).toEqual([]);
      expect((await readBack(a, objectId, 1))?.revision).toEqual(head);
      const id = gen();
      expect(await write(a, objectId, 2, "ai target", { actor: "generation", cause: "ai_generation", generationId: id }, undefined, "primary")).toMatchObject({ result: "Applied", revision: { generationId: id, actorKind: "generation", cause: "ai_generation" } });
      expect((await readBack(a, objectId))?.head.generationId).toBe(id);
      await lockObject(a, objectId);
      const held = gen();
      expect(await write(a, objectId, 3, "ai target", { actor: "generation", generationId: held }, undefined, "supporting")).toMatchObject({ result: "HeldAsOption" });
      expect((await readBack(a, objectId))?.sideLine).toMatchObject([{ origin: "held", generationId: held }]);
    });

    it("LINEAGE §6.3: a no-op save is not a write, even on a locked object; a changed write still meets the lock", async () => {
      const { write, newObject, lockObject, rowCounts, a } = await setup();
      const objectId = await newObject("steady");
      expect(await write(a, objectId, 1, "steady", {}, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true });
      const unlocked = await rowCounts();
      expect(await write(a, objectId, 2, "steady", {}, undefined, "supporting")).toMatchObject({ result: "Applied", appended: false, revision: { sequence: 2 } });
      expect(await rowCounts()).toEqual(unlocked);
      await lockObject(a, objectId);
      const locked = await rowCounts();
      expect(await write(a, objectId, 2, "steady", {}, undefined, "supporting")).toMatchObject({ result: "Applied", appended: false, revision: { sequence: 2 } });
      expect(await rowCounts()).toEqual(locked);
      expect(await write(a, objectId, 2, "steady", {}, undefined, "primary")).toMatchObject({ result: "NeedsConfirmation" });
      // A stale no-op is not waved through: the base is still judged.
      expect(await write(a, objectId, 1, "steady", {}, undefined, "supporting")).toMatchObject({ result: "NeedsConfirmation" });
      expect(await rowCounts()).toEqual(locked);
    });

    it("MODULE §5.1 (4): a sync Revision is AI-made, so it needs a Generation like any other", async () => {
      const { write, newObject, rowCounts, a } = await setup();
      const objectId = await newObject("sync target");
      const before = await rowCounts();
      expect(await write(a, objectId, 1, "sync target", { cause: "sync" }, undefined, "supporting")).toMatchObject({ result: "Refused", reason: "missing-provenance" });
      expect(await rowCounts()).toEqual(before);
      expect(await write(a, objectId, 1, "sync target", { cause: "sync", actor: "generation", generationId: gen() }, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true, revision: { cause: "sync", actorKind: "generation" } });
    });

    it("STORY-DOCUMENTS §4: a keyed result is recorded with its write, scoped to the Account, and rolled back with it", async () => {
      const { store, a, b } = await setup();
      const row = { operation: "source-material.paste" as const, key: "k1", fingerprint: "f", result: { n: 1 }, createdAt: new Date(tick).toISOString() };
      await expect(store.write(a, async (tx) => { await tx.recordIdempotency(row); throw new Error("abort"); })).rejects.toThrow("abort");
      expect(await store.write(a, (tx) => tx.idempotency(row.operation, row.key))).toBeNull();
      await store.write(a, (tx) => tx.recordIdempotency(row));
      expect(await store.write(a, (tx) => tx.idempotency(row.operation, row.key))).toEqual(row);
      expect(await store.write(b, (tx) => tx.idempotency(row.operation, row.key))).toBeNull();
      expect(await store.write(a, (tx) => tx.idempotency("source-material.change-role", row.key))).toBeNull();
      await expect(store.write(a, (tx) => tx.recordIdempotency({ ...row, result: { n: 2 } }))).rejects.toThrow();
    });

    it("ADR 0020: a Revision stores frozen slice fingerprints that read back exactly and are never recomputed", async () => {
      const { write, newObject, read: readBack, store, a, projectId } = await setup();
      const text = "fingerprint me 🎬";
      const objectId = await newObject(text);
      const independent = createHash("sha256").update(JSON.stringify(text)).digest("hex");
      const first = (await readBack(a, objectId))?.head;
      expect(first?.fingerprints).toEqual({ content: independent });
      // The role is a descriptor: a new Revision, the same content fingerprint, a different body hash.
      await write(a, objectId, 1, text, {}, undefined, "supporting");
      const second = (await readBack(a, objectId))?.head;
      expect(second?.fingerprints).toEqual({ content: independent });
      expect(second?.bodyHash).not.toBe(first?.bodyHash);
      // A later change to a slice function affects only later Revisions: old ones read back as stored.
      const changed = { ...sourceMaterialKind, slices: { content: () => "a different definition", extra: (body: { role: string }) => body.role } };
      await store.write(a, (tx) => createHistory([changed]).commit(tx, a, { kind: KIND, projectId, objectId, base: 2, body: { text, role: "primary" } }, context()));
      const found = await readBack(a, objectId);
      expect((await readBack(a, objectId, 1))?.revision?.fingerprints).toEqual({ content: independent });
      expect(found?.head.fingerprints).toEqual({ content: createHash("sha256").update(JSON.stringify("a different definition")).digest("hex"), extra: createHash("sha256").update(JSON.stringify("primary")).digest("hex") });
    });

    it("never rewrites a Revision, and a thrown transaction appends nothing", async () => {
      const { write, newObject, read: readBack, rowCounts, store, a, projectId } = await setup();
      const objectId = await newObject("one");
      const first = (await readBack(a, objectId))?.head;
      await write(a, objectId, 1, "one", {}, undefined, "supporting");
      await write(a, objectId, 1, "one", {}, undefined, "primary");
      await write(a, objectId, 2, "one", {}, undefined, "primary");
      expect((await readBack(a, objectId, 1))?.revision).toEqual(first);
      expect((await readBack(a, objectId))?.sequences).toEqual([1, 2, 3]);
      const before = await rowCounts();
      await expect(store.write(a, async (tx) => {
        await commit(tx, a, { kind: KIND, projectId, objectId, base: 3, body: { text: "one", role: "supporting" } }, context());
        throw new Error("abort");
      })).rejects.toThrow("abort");
      expect(await rowCounts()).toEqual(before);
    });

    it("a save equal to the head appends nothing", async () => {
      const { write, newObject, rowCounts, a } = await setup();
      const objectId = await newObject("same");
      const before = await rowCounts();
      expect(await write(a, objectId, 1, "same")).toMatchObject({ result: "Applied", appended: false, revision: { sequence: 1 } });
      expect(await rowCounts()).toEqual(before);
    });

    it("refuses what it cannot apply and leaves nothing behind", async () => {
      const { write, newObject, rowCounts, store, a, b, projectId } = await setup();
      const objectId = await newObject();
      const before = await rowCounts();
      const absentProject = projectIdSchema.parse(uuidv7());
      expect(await write(a, objectIdSchema.parse(uuidv7()), 0, "x", {}, absentProject)).toMatchObject({ result: "Refused", reason: "not-found" });
      expect(await write(a, objectIdSchema.parse(uuidv7()), 3, "x")).toMatchObject({ result: "Refused", reason: "not-found" });
      expect(await write(a, objectIdSchema.parse(uuidv7()), 0, "bad \u0000 nul")).toMatchObject({ result: "Refused", reason: "invalid-body" });
      expect(await write(a, objectIdSchema.parse(uuidv7()), 0, "")).toMatchObject({ result: "Refused", reason: "invalid-body" });
      const other = createHistory([sourceMaterialKind, { ...sourceMaterialKind, kind: "other" }]);
      expect(await store.write(a, (tx) => other.commit(tx, a, { kind: "other", projectId, objectId, base: 1, body: { text: "k", role: "primary" } }, context()))).toMatchObject({ result: "Refused", reason: "kind-mismatch" });
      const strict = createHistory([{ ...sourceMaterialKind, invariants: [() => false] }]);
      expect(await store.write(a, (tx) => strict.commit(tx, a, { kind: KIND, projectId, objectId, base: 1, body: { text: "k", role: "primary" } }, context()))).toMatchObject({ result: "Refused", reason: "invariant-violated" });
      // Another Account cannot append to, or even see, this object.
      expect(await write(b, objectId, 1, "intruder")).toMatchObject({ result: "Refused", reason: "not-found" });
      expect(await store.read(b, (tx) => read(tx, b, objectId))).toBeNull();
      expect(await rowCounts()).toEqual(before);
    });

    it("reaches NeedsConfirmation and HeldAsOption through a lock, and edit-through only with the current impact version", async () => {
      const { write, newObject, read: readBack, lockObject, rowCounts, store, a, projectId } = await setup();
      const objectId = await newObject("locked text");
      await lockObject(a, objectId);
      const before = await rowCounts();
      expect(await write(a, objectId, 1, "locked text", {}, undefined, "supporting")).toMatchObject({ result: "NeedsConfirmation", impact: { version: 1, reached: [] } });
      expect(await rowCounts()).toEqual(before);
      expect(await store.read(a, (tx) => derive(tx, a, objectId))).toEqual({ markers: [], impact: { version: 1, reached: [] } });
      const held = await write(a, objectId, 1, "locked text", { actor: "generation", generationId: gen() }, undefined, "supporting");
      expect(held).toMatchObject({ result: "HeldAsOption" });
      expect((await readBack(a, objectId))?.sideLine).toMatchObject([{ origin: "held", body: { text: "locked text", role: "supporting" } }]);
      expect((await readBack(a, objectId))?.sequences).toEqual([1]);
      const grant = { objectId, creatorId: a.creatorId, impactVersion: 1 };
      expect(await write(a, objectId, 1, "locked text", { editSession: { ...grant, impactVersion: 0 } }, undefined, "supporting")).toMatchObject({ result: "NeedsConfirmation" });
      expect(await write(a, objectId, 1, "locked text", { editSession: { ...grant, creatorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" as typeof a.creatorId } }, undefined, "supporting")).toMatchObject({ result: "NeedsConfirmation" });
      expect(await write(a, objectId, 1, "locked text", { editSession: grant }, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 2 } });
      expect(projectId).toBeDefined();
    });

    it("lets all five results be observed", async () => {
      const { write, newObject, lockObject, a } = await setup();
      const objectId = await newObject();
      const seen = new Set<CommitResult["result"]>();
      for (const result of [await write(a, objectId, 1, "first", {}, undefined, "supporting"), await write(a, objectId, 1, "first", {}, undefined, "primary"), await write(a, objectIdSchema.parse(uuidv7()), 1, "x")]) seen.add(result.result);
      await lockObject(a, objectId);
      for (const result of [await write(a, objectId, 2, "first"), await write(a, objectId, 2, "first", { actor: "generation", generationId: gen() })]) seen.add(result.result);
      expect([...seen].sort()).toEqual(["Applied", "HeldAsOption", "NeedsConfirmation", "Refused", "StaleBase"]);
    });

    it("VC3: any sequence of reads leaves every row count unchanged", async () => {
      const { write, newObject, read: readBack, rowCounts, store, a, b, projectId, lockObject } = await setup();
      const objectId = await newObject("r1");
      await write(a, objectId, 1, "r1", {}, undefined, "supporting");
      await write(a, objectId, 1, "r1", {}, undefined, "primary");
      await lockObject(a, objectId);
      const absent = objectIdSchema.parse(uuidv7());
      const reads = [
        () => readBack(a, objectId), () => readBack(a, objectId, 1), () => readBack(a, objectId, 99), () => readBack(a, absent), () => readBack(b, objectId),
        () => store.read(a, (tx) => tx.projects()), () => store.read(a, (tx) => derive(tx, a, objectId)), () => store.read(a, (tx) => tx.lockState(objectId)),
        () => store.read(a, (tx) => tx.account(a.accountId)), () => store.read(b, (tx) => tx.project(projectId)),
      ];
      const before = await rowCounts();
      await fc.assert(fc.asyncProperty(fc.array(fc.nat(reads.length - 1), { maxLength: 25 }), async (order) => {
        for (const index of order) await reads[index]?.();
        expect(await rowCounts()).toEqual(before);
      }), { numRuns: 15 });
    });
  });
}
