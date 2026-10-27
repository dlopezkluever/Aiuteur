import { assertDeliverable, MailDeliveryError, type Mailer, type MailMessage } from "@aiuteur/mail";
import type { MailerSubject } from "./conformance/mailer.ts";

/** In-memory Mailer. Delivery is the outbox; it never leaves the process. */
export class FakeMailer implements Mailer {
  readonly outbox: MailMessage[] = [];
  #failures = 0;

  /** The next `send` rejects as a provider outage would. */
  failNext(): void { this.#failures++; }

  async send(message: MailMessage): Promise<void> {
    assertDeliverable(message);
    if (this.#failures > 0) { this.#failures--; throw new MailDeliveryError(); }
    this.outbox.push({ ...message });
  }

  /** The most recent message to `to`, or undefined. */
  lastTo(to: string): MailMessage | undefined { return this.outbox.findLast((message) => message.to === to); }

  subject(): MailerSubject {
    return { mailer: this, delivered: async () => this.outbox.map(({ to, subject, text }) => ({ to, subject, text })), failNext: () => this.failNext() };
  }
}
