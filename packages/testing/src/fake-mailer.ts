import type { MailMessage, Mailer } from "@aiuteur/store";
import type { DeliveredMail, MailerSubject } from "./conformance/mailer.ts";

/** Records messages in memory. Refuses recipients whose local part is `refuse`, as the conformance suite requires. */
export class FakeMailer implements Mailer {
  readonly #sent: MailMessage[] = [];
  #gate: Promise<void> | undefined;

  async send(message: MailMessage): Promise<void> {
    if (this.#gate) await this.#gate;
    if (message.to.split("@")[0] === "refuse") throw new Error("recipient refused");
    this.#sent.push({ ...message });
  }

  /** Delivery waits until the returned function is called. Lets a test prove a response does not wait for mail. */
  hold(): () => void {
    let release = () => {};
    this.#gate = new Promise<void>((resolve) => { release = resolve; });
    return () => { this.#gate = undefined; release(); };
  }

  sent(): readonly MailMessage[] {
    return this.#sent.map((message) => ({ ...message }));
  }
}

export async function fakeMailerSubject(): Promise<MailerSubject> {
  const mailer = new FakeMailer();
  return {
    mailer,
    async delivered(): Promise<readonly DeliveredMail[]> { return mailer.sent(); },
    async close() {},
  };
}
