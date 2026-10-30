import { describe, expect, it } from "vitest";
import type { Deployment, ErrorSink, ScrubbedEvent } from "@aiuteur/observability";

export interface ErrorSinkSubject {
  readonly sink: ErrorSink;
  readonly deployment: Deployment;
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

    it("carries no free text through stack frames, and no secret through an id tag", async () => {
      const { sink, wire, events } = await subject();
      const error = new Error("x");
      error.stack = [
        "Error: x",
        `    at ${PROMPT} (/app/src/ok.ts:1:2)`,
        `    at Mara.reads the letter (/app/src/ok.ts:3:4)`,
        `    at fine.method (/app/${PROMPT}.ts:5:6)`,
        `    at async Real.name (/app/src/real.ts:7:8)`,
        `    at ${KEY} (/app/src/key.ts:9:1)`,
      ].join("\n");
      sink.capture(error, { jobId: KEY, accountId: "acc_1" });
      await sink.flush(2_000);
      const text = (await wire()).join("\n");
      expect(text).not.toContain(PROMPT);
      expect(text).not.toContain("Mara.reads");
      expect(text).not.toContain(KEY);
      const [event] = await events();
      expect(event?.tags).toEqual({ accountId: "acc_1", jobId: "[scrubbed]" });
      // Bounded identifiers and code paths survive, so the stack still groups and correlates.
      expect(event?.frames.map((f) => [f.function, f.file])).toEqual([[null, "/app/src/ok.ts"], [null, "/app/src/ok.ts"], ["fine.method", "unknown"], ["Real.name", "/app/src/real.ts"], [null, "/app/src/key.ts"]]);
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
