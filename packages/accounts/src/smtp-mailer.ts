import nodemailer from "nodemailer";
import type { Mailer } from "@aiuteur/store";

export interface SmtpMailerOptions {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user?: string;
  password?: string;
}

/**
 * The Mailer adapter for any transactional-email service that offers SMTP. The vendor
 * is configuration; SPF and DKIM belong to the sending domain (OPERATIONAL-BASELINE §2.3).
 */
export function createSmtpMailer(options: SmtpMailerOptions): Mailer {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.user === undefined ? undefined : { user: options.user, pass: options.password },
  });
  return {
    async send(message) {
      await transport.sendMail({ from: options.from, to: message.to, subject: message.subject, text: message.text });
    },
  };
}
