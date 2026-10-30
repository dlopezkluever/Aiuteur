import { describe, expect, it } from "vitest";
import type { Deployment, ErrorSink, ScrubbedEvent } from "@aiuteur/observability";

export interface ErrorSinkSubject {
  readonly sink: ErrorSink;
  readonly deployment: Deployment;
  /** The one source file this subject's index lists; frames naming any other file must report `unknown`. */
  readonly knownFile: string;
  /** Every event the tracker received, normalised to the scrubbed shape, oldest first. */
  events(): Promise<readonly ScrubbedEvent[]>;
  /** The raw text of everything the tracker received, so absence can be asserted on the wire itself. */
  wire(): Promise<readonly string[]>;
}

/** The planted values below must never reach a tracker (VERIFICATION-AND-OBSERVABILITY §2.3: B never becomes A). */
const PROMPT = "A close-up of Mara reading the secret letter aloud";
const KEY = "synthetic-plant-key-0123456789";

/** VC4 ErrorSink conformance: one suite, run against the fake and the hosted adapter. Secrets planted in the registry must be `KEY`. */
export function describeErrorSinkConformance(name: string, subject: () => Promise<ErrorSinkSubject>): void {
  describe(`ErrorSink conformance: ${name}`, () => {
    it("reports class, code, frames, release, role, environment and the id tags", async () => {
      const { sink, deployment, events } = await subject();
      sink.capture(new TypeError("boom"), { code: "invariant-violated", accountId: "acc_1", jobId: "job-2", requestId: "req-3" });
      await sink.flush(2_000);
      const [event] = await events();
      expect(event).toMatchObject({ errorClass: "TypeError", code: "invariant-violated", release: deployment.release, role: deployment.role, environment: deployment.environment, tags: { accountId: "acc_1", jobId: "job-2", requestId: "req-3" } });
      expect(event?.frames.length).toBeGreaterThan(0);
    });

    it("never forwards the message, a planted prompt, a planted key, or a field outside the typed set", async () => {
      const { sink, wire } = await subject();
      const error = Object.assign(new Error(`provider echoed: ${PROMPT} using ${KEY}`), { code: "E_PROVIDER", response: { body: PROMPT }, headers: { authorization: KEY } });
      sink.capture(error, { accountId: "acc_1", prompt: PROMPT, note: KEY, requestId: `not an id: ${PROMPT}`, code: `Bad Code ${KEY}` } as never);
      sink.capture(`a thrown string ${PROMPT} ${KEY}`);
      sink.capture({ message: PROMPT, stack: `at ${KEY}` });
      await sink.flush(2_000);
      const text = (await wire()).join("\n");
      expect(text).not.toContain(PROMPT);
      expect(text).not.toContain(KEY);
      expect(text).not.toContain("E_PROVIDER");
      expect(text).not.toContain("authorization");
    });

    it("reports stack frames only as listed source files with positions: no function names, no other path", async () => {
      const { sink, wire, events, knownFile } = await subject();
      const prompts = ["Mara_reads_private_treatment_draft", "Close_up_of_the_sealed_letter", "a b c free text", "x".repeat(60)];
      const error = new Error("x");
      error.stack = [
        "Error: x",
        ...prompts.flatMap((name, i) => [`    at ${name} (/app/${name}.ts:${i + 1}:2)`, `    at Class.${name} (file:///app/src/${name}.ts:${i + 1}:3)`]),
        `    at ${KEY} (/app/src/${KEY}.ts:9:1)`,
        `    at ${PROMPT} (/app/src/${PROMPT}.ts:9:1)`,
        `    at async Real.name (${knownFile}:7:8)`,
        `    at new Thing (file://${knownFile}:9:10)`,
        `    at ${knownFile}:11:12`,
      ].join("\n");
      sink.capture(error, { jobId: KEY, accountId: "acc_1" });
      await sink.flush(2_000);
      const text = (await wire()).join("\n");
      for (const leak of [...prompts, PROMPT, KEY, "Real.name", "Thing", "Class."]) expect(text).not.toContain(leak);
      const [event] = await events();
      expect(event?.tags).toEqual({ accountId: "acc_1", jobId: "[scrubbed]" });
      const known = event?.frames.filter((f) => f.file === knownFile) ?? [];
      expect(known.map((f) => [f.line, f.column])).toEqual([[7, 8], [9, 10], [11, 12]]);
      expect(event?.frames.filter((f) => f.file !== knownFile && f.file !== "unknown")).toEqual([]);
      expect(event?.frames.length).toBe(4 * 2 + 2 + 3);
    });

    it("classifies by a closed list of built-in classes, never by a runtime class name", async () => {
      const { sink, wire, events } = await subject();
      const named = (name: string, base: new (m: string) => Error = Error) => Object.defineProperty(class extends base {}, "name", { value: name });
      const longName = "A".repeat(63) + "_private_prompt_text";
      const leaks = ["Mara_reads_private_treatment_draft", "Sealed_letter_close_up", longName, KEY.replaceAll("-", "_")];
      for (const name of leaks) sink.capture(new (named(name))("x"));
      sink.capture(new (named("Mara_reads_private_treatment_draft", TypeError))("x"));
      class Plain extends Error {}
      sink.capture(new Plain("x"));
      sink.capture(new RangeError("x"));
      await sink.flush(2_000);
      const text = (await wire()).join("\n");
      for (const leak of [...leaks, "Plain"]) expect(text).not.toContain(leak);
      expect((await events()).map((event) => event.errorClass)).toEqual(["Error", "Error", "Error", "Error", "TypeError", "Error", "RangeError"]);
    });

    it("reports a thrown non-Error as a neutral class and never throws to the caller", async () => {
      const { sink, events } = await subject();
      expect(() => sink.capture(undefined)).not.toThrow();
      expect(() => sink.capture(Object.create(null))).not.toThrow();
      await sink.flush(2_000);
      expect((await events()).map((event) => event.errorClass)).toEqual(["NonError", "NonError"]);
    });
  });
}
