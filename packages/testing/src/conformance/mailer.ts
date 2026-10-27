import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Mailer } from "@aiuteur/store";

/** What an adapter's receiving side saw, as the recipient would read it. */
export interface DeliveredMail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}
export interface MailerSubject {
  readonly mailer: Mailer;
  delivered(): Promise<readonly DeliveredMail[]>;
  close(): Promise<void>;
}

/**
 * Mailer port contract, run against every adapter (the fake and the SMTP adapter).
 * A recipient whose local part is `refuse` is undeliverable on every adapter.
 */
export function describeMailerConformance(name: string, open: () => Promise<MailerSubject>): void {
  describe(`Mailer conformance: ${name}`, () => {
    let subject: MailerSubject;
    beforeAll(async () => { subject = await open(); });
    afterAll(async () => { await subject?.close(); });

    it("delivers recipient, subject and text unchanged", async () => {
      const text = "Recover your studio: https://aiuteur.test/api/auth/reset-password/abc123?callbackURL=\nIf you did not ask, ignore this.";
      await subject.mailer.send({ to: "creator@example.test", subject: "Recover your Aiuteur account", text });
      expect((await subject.delivered()).at(-1)).toEqual({ to: "creator@example.test", subject: "Recover your Aiuteur account", text });
    });

    it("rejects a refused recipient instead of reporting success", async () => {
      const before = (await subject.delivered()).length;
      await expect(subject.mailer.send({ to: "refuse@example.test", subject: "Refused", text: "x" })).rejects.toThrow();
      const delivered = await subject.delivered();
      expect(delivered).toHaveLength(before);
      expect(delivered.some((mail) => mail.to === "refuse@example.test")).toBe(false);
    });
  });
}
