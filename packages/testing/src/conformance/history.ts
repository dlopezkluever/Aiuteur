import { randomUUID } from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { objectIdSchema, projectIdSchema, type ObjectId, type ProjectId } from "@aiuteur/contract";
import { commit, derive, read, type CommitContext, type CommitResult } from "@aiuteur/history";
import type { Scope } from "@aiuteur/store";
import { sourceMaterialKind } from "@aiuteur/story";
import type { StoreSubject } from "./store.ts";

const ids = { uuid: randomUUID, token: randomUUID };
let tick = Date.UTC(2026, 0, 1);
const context = (extra: Partial<CommitContext> = {}): CommitContext => ({ actor: "creator", cause: "import", at: (tick += 1000), ids, ...extra });

/** Draft FC3 conformance: the write gate must behave identically on every Store. */
export function describeHistoryConformance(name: string, subject: () => Promise<StoreSubject>): void {
  describe(`History conformance: ${name}`, () => {
    async function setup() {
      const s = await subject();
      const projectId = projectIdSchema.parse(randomUUID());
      await s.store.write(s.a, (tx) => tx.insertProject({ projectId, createdAt: new Date(tick).toISOString() }));
      const write = (scope: Scope, objectId: ObjectId, base: number, text: string, extra: Partial<CommitContext> = {}, project: ProjectId = projectId, role: "primary" | "supporting" = "primary") =>
        s.store.write(scope, (tx) => commit(tx, scope, { kind: sourceMaterialKind, projectId: project, objectId, base, body: { text, role } }, context(extra)));
      const newObject = async (text = "first") => {
        const objectId = objectIdSchema.parse(randomUUID());
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
        const objectId = objectIdSchema.parse(randomUUID());
        expect(await write(a, objectId, 0, text)).toMatchObject({ result: "Applied" });
        expect((await readBack(a, objectId))?.head.body).toEqual({ text, role: "primary" });
      }
      await fc.assert(fc.asyncProperty(fc.string({ unit: "grapheme", minLength: 1 }).filter((text) => !text.includes("\u0000")), async (text) => {
        const objectId = objectIdSchema.parse(randomUUID());
        expect(await write(a, objectId, 0, text)).toMatchObject({ result: "Applied" });
        expect((await readBack(a, objectId))?.head.body).toEqual({ text, role: "primary" });
      }), { numRuns: 15 });
    });

    it("a stale base returns StaleBase, keeps the winner as head and keeps the loser on a side line", async () => {
      const { write, newObject, read: readBack, a } = await setup();
      const objectId = await newObject("original");
      expect(await write(a, objectId, 1, "winner", {}, undefined, "supporting")).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 2 } });
      const stale = await write(a, objectId, 1, "loser");
      expect(stale).toMatchObject({ result: "StaleBase", head: 2 });
      const found = await readBack(a, objectId);
      expect(found?.head).toMatchObject({ sequence: 2, body: { text: "winner", role: "supporting" } });
      expect(found?.sequences).toEqual([1, 2]);
      expect(found?.sideLine).toMatchObject([{ attemptId: stale.result === "StaleBase" ? stale.attemptId : "", basedOn: 1, origin: "stale-base", body: { text: "loser", role: "primary" } }]);
    });

    it("concurrent commits from one base produce one winner; every other is StaleBase and kept", async () => {
      const { write, newObject, read: readBack, a } = await setup();
      const objectId = await newObject();
      const texts = Array.from({ length: 8 }, (_, index) => `contender ${index}`);
      const results = await Promise.all(texts.map((text) => write(a, objectId, 1, text)));
      const applied = results.flatMap((result, index) => result.result === "Applied" ? [index] : []);
      expect(applied).toHaveLength(1);
      expect(results.filter((result) => result.result === "StaleBase")).toHaveLength(7);
      const found = await readBack(a, objectId);
      expect(found?.sequences).toEqual([1, 2]);
      expect(found?.head.body).toEqual({ text: texts[applied[0] ?? 0], role: "primary" });
      expect(found?.sideLine.map((entry) => (entry.body as { text: string }).text).sort()).toEqual(texts.filter((_, index) => index !== applied[0]).sort());
      // Two pastes racing to create the same object: one creates it, the other is stale at base 0.
      const created = objectIdSchema.parse(randomUUID());
      const race = await Promise.all([write(a, created, 0, "x"), write(a, created, 0, "y")]);
      expect(race.map((result) => result.result).sort()).toEqual(["Applied", "StaleBase"]);
    });

    it("never rewrites a Revision, and a thrown transaction appends nothing", async () => {
      const { write, newObject, read: readBack, rowCounts, store, a, projectId } = await setup();
      const objectId = await newObject("one");
      const first = (await readBack(a, objectId))?.head;
      await write(a, objectId, 1, "two");
      await write(a, objectId, 1, "stale");
      await write(a, objectId, 2, "three");
      expect((await readBack(a, objectId, 1))?.revision).toEqual(first);
      expect((await readBack(a, objectId))?.sequences).toEqual([1, 2, 3]);
      const before = await rowCounts();
      await expect(store.write(a, async (tx) => {
        await commit(tx, a, { kind: sourceMaterialKind, projectId, objectId, base: 3, body: { text: "doomed", role: "primary" } }, context());
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
      const absentProject = projectIdSchema.parse(randomUUID());
      expect(await write(a, objectIdSchema.parse(randomUUID()), 0, "x", {}, absentProject)).toMatchObject({ result: "Refused", reason: "not-found" });
      expect(await write(a, objectIdSchema.parse(randomUUID()), 3, "x")).toMatchObject({ result: "Refused", reason: "not-found" });
      expect(await write(a, objectIdSchema.parse(randomUUID()), 0, "bad \u0000 nul")).toMatchObject({ result: "Refused", reason: "invalid-body" });
      expect(await write(a, objectIdSchema.parse(randomUUID()), 0, "")).toMatchObject({ result: "Refused", reason: "invalid-body" });
      expect(await store.write(a, (tx) => commit(tx, a, { kind: { ...sourceMaterialKind, kind: "other" }, projectId, objectId, base: 1, body: { text: "k", role: "primary" } }, context()))).toMatchObject({ result: "Refused", reason: "kind-mismatch" });
      expect(await store.write(a, (tx) => commit(tx, a, { kind: { ...sourceMaterialKind, invariants: [() => false] }, projectId, objectId, base: 1, body: { text: "k", role: "primary" } }, context()))).toMatchObject({ result: "Refused", reason: "invariant-violated" });
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
      expect(await write(a, objectId, 1, "edit")).toMatchObject({ result: "NeedsConfirmation", impact: { version: 1, reached: [] } });
      expect(await rowCounts()).toEqual(before);
      expect(await store.read(a, (tx) => derive(tx, a, objectId))).toEqual({ markers: [], impact: { version: 1, reached: [] } });
      const held = await write(a, objectId, 1, "ai text", { actor: "generation" });
      expect(held).toMatchObject({ result: "HeldAsOption" });
      expect((await readBack(a, objectId))?.sideLine).toMatchObject([{ origin: "held", body: { text: "ai text" } }]);
      expect((await readBack(a, objectId))?.sequences).toEqual([1]);
      const grant = { objectId, creatorId: a.creatorId, impactVersion: 1 };
      expect(await write(a, objectId, 1, "stale grant", { editSession: { ...grant, impactVersion: 0 } })).toMatchObject({ result: "NeedsConfirmation" });
      expect(await write(a, objectId, 1, "other creator", { editSession: { ...grant, creatorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" as typeof a.creatorId } })).toMatchObject({ result: "NeedsConfirmation" });
      expect(await write(a, objectId, 1, "through", { editSession: grant })).toMatchObject({ result: "Applied", appended: true, revision: { sequence: 2 } });
      expect(projectId).toBeDefined();
    });

    it("lets all five results be observed", async () => {
      const { write, newObject, lockObject, a } = await setup();
      const objectId = await newObject();
      const seen = new Set<CommitResult["result"]>();
      for (const result of [await write(a, objectId, 1, "n"), await write(a, objectId, 1, "stale"), await write(a, objectIdSchema.parse(randomUUID()), 1, "x")]) seen.add(result.result);
      await lockObject(a, objectId);
      for (const result of [await write(a, objectId, 2, "c"), await write(a, objectId, 2, "g", { actor: "generation" })]) seen.add(result.result);
      expect([...seen].sort()).toEqual(["Applied", "HeldAsOption", "NeedsConfirmation", "Refused", "StaleBase"]);
    });

    it("VC3: any sequence of reads leaves every row count unchanged", async () => {
      const { write, newObject, read: readBack, rowCounts, store, a, b, projectId, lockObject } = await setup();
      const objectId = await newObject("r1");
      await write(a, objectId, 1, "r2");
      await write(a, objectId, 1, "stale");
      await lockObject(a, objectId);
      const absent = objectIdSchema.parse(randomUUID());
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
