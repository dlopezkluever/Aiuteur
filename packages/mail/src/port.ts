/** OPERATIONAL-BASELINE §2.3: the Mailer carries only these three kinds of mail. */
export const MAIL_KINDS = ["invitation", "recovery", "operator-alert"] as const;
export type MailKind = (typeof MAIL_KINDS)[number];

/** One plain-text message to one recipient. */
export interface MailMessage {
  readonly kind: MailKind;
  /** A single bare address. Anything else is refused, never split into several recipients. */
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

/** Draft platform port (MODULE-ARCHITECTURE §3.5): a failed delivery rejects with MailDeliveryError; success means the provider accepted the message. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Carries no address, subject or body: recovery links are bearer secrets (G8). */
export class MailDeliveryError extends Error {
  constructor() { super("mail delivery failed"); this.name = "MailDeliveryError"; }
}

const BARE_ADDRESS = /^[^\s,;:<>"()[\]\\@]+@[^\s,;:<>"()[\]\\@]+$/;
/** Shared by every adapter, so a refusal is the same whichever one is wired. */
export function assertDeliverable(message: MailMessage): void {
  if (!MAIL_KINDS.includes(message.kind) || !BARE_ADDRESS.test(message.to) || /[\r\n]/.test(message.subject) || message.subject === "") {
    throw new MailDeliveryError();
  }
}
