import { describe, expect, it } from "vitest";
import { MailDeliveryError, type Mailer, type MailMessage } from "@aiuteur/mail";

export type Delivered = Pick<MailMessage, "to" | "subject" | "text">;

export interface MailerSubject {
  readonly mailer: Mailer;
  /** Everything the adapter's provider actually received, oldest first. The kind is routing metadata and does not travel. */
  delivered(): Promise<readonly Delivered[]>;
  /** The provider rejects the next delivery attempt. */
  failNext(): void;
}

const wire = ({ to, subject, text }: MailMessage): Delivered => ({ to, subject, text });
const message = (overrides: Partial<MailMessage> = {}): MailMessage => ({
  kind: "recovery", to: "creator@example.test", subject: "Recover your Aiuteur studio",
  text: "Use this link to choose a new password:\nhttps://aiuteur.test/recover#token=abc", ...overrides,
});

/** VC4 Mailer conformance: one suite, run against the fake and the real (SMTP) adapter. */
export function describeMailerConformance(name: string, subject: () => Promise<MailerSubject>): void {
  describe(`Mailer conformance: ${name}`, () => {
    it("delivers one message to the one recipient with subject and body unchanged, including a long unbroken link", async () => {
      const { mailer, delivered } = await subject();
      const long = `https://aiuteur.test/recover#token=${"Zq9-_".repeat(60)}`;
      const sent = message({ to: "creator@example.test", subject: "Récupération — Aiuteur", text: `Bonjour ✓\n\n${long}\nFin` });
      await mailer.send(sent);
      expect(await delivered()).toEqual([wire(sent)]);
    });

    it("delivers each send exactly once, in order, including concurrent sends", async () => {
      const { mailer, delivered } = await subject();
      const first = message({ to: "a@example.test", text: "one" });
      const second = message({ to: "b@example.test", kind: "operator-alert", text: "two" });
      await mailer.send(first);
      await mailer.send(second);
      expect(await delivered()).toEqual([wire(first), wire(second)]);
      const many = Array.from({ length: 8 }, (_, index) => message({ to: `c${index}@example.test`, text: `n${index}` }));
      await Promise.all(many.map((each) => mailer.send(each)));
      const all = (await delivered()).slice(2);
      expect(all).toHaveLength(8);
      expect(new Set(all.map((each) => each.to))).toEqual(new Set(many.map((each) => each.to)));
    });

    it("refuses a recipient list or header injection and delivers nothing", async () => {
      const { mailer, delivered } = await subject();
      for (const bad of [
        message({ to: "a@example.test, b@example.test" }),
        message({ to: "a@example.test\r\nBcc: b@example.test" }),
        message({ to: "Creator <a@example.test>" }),
        message({ subject: "Hi\r\nBcc: b@example.test" }),
      ]) await expect(mailer.send(bad)).rejects.toBeInstanceOf(MailDeliveryError);
      expect(await delivered()).toEqual([]);
    });

    it("rejects when the provider fails, leaking none of the message, and delivers normally afterwards", async () => {
      const { mailer, delivered, failNext } = await subject();
      failNext();
      const secret = message({ to: "victim@example.test", text: "https://aiuteur.test/recover#token=SECRET-TOKEN-VALUE" });
      const error = await mailer.send(secret).then(() => null, (caught: unknown) => caught);
      expect(error).toBeInstanceOf(MailDeliveryError);
      const exposed = `${String(error)} ${JSON.stringify(error)} ${error instanceof Error ? error.stack : ""}`;
      expect(exposed).not.toMatch(/SECRET-TOKEN-VALUE|victim@example\.test|Recover your/);
      expect(await delivered()).toEqual([]);
      await mailer.send(message());
      expect(await delivered()).toEqual([wire(message())]);
    });
  });
}
