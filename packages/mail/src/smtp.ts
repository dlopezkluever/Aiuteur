import { createTransport } from "nodemailer";
import { assertDeliverable, MailDeliveryError, type Mailer } from "./port.ts";

export interface SmtpMailerOptions {
  host: string;
  port: number;
  from: string;
  /** `tls` is implicit TLS, `starttls` requires an upgrade, `none` is accepted only for a loopback host. */
  security: "tls" | "starttls" | "none";
  auth?: { user: string; pass: string };
}

/** Any transactional-email service speaks SMTP, so the vendor stays a configuration choice. */
export function createSmtpMailer(options: SmtpMailerOptions): Mailer & { close(): void } {
  if (options.security === "none" && !["127.0.0.1", "::1", "localhost"].includes(options.host)) {
    throw new Error("unencrypted SMTP is only allowed on a loopback host");
  }
  const transport = createTransport({
    host: options.host,
    port: options.port,
    secure: options.security === "tls",
    requireTLS: options.security === "starttls",
    ignoreTLS: options.security === "none",
    ...(options.auth ? { auth: options.auth } : {}),
  });
  return {
    async send(message) {
      assertDeliverable(message);
      try {
        await transport.sendMail({ from: options.from, to: message.to, subject: message.subject, text: message.text });
      } catch {
        throw new MailDeliveryError();
      }
    },
    close: () => transport.close(),
  };
}
