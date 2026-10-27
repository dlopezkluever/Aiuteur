import { afterAll } from "vitest";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { createSmtpMailer } from "@aiuteur/mail";
import { describeMailerConformance, FakeMailer, type Delivered, type MailerSubject } from "../src/index.ts";

describeMailerConformance("FakeMailer", async () => new FakeMailer().subject());

// The real adapter speaks SMTP to an in-process loopback server that records what the wire delivered.
const closers: Array<() => void> = [];
afterAll(() => { for (const close of closers) close(); });

async function smtpSubject(): Promise<MailerSubject> {
  const received: Delivered[] = [];
  let failures = 0;
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS", "AUTH"],
    onData(stream, _session, done) {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        if (failures > 0) {
          failures--;
          done(Object.assign(new Error("451 try later for victim@example.test SECRET-TOKEN-VALUE"), { responseCode: 451 }));
          return;
        }
        simpleParser(Buffer.concat(chunks)).then((parsed) => {
          const to = Array.isArray(parsed.to) ? parsed.to.flatMap((each) => each.value) : (parsed.to?.value ?? []);
          const address = to[0]?.address;
          if (to.length !== 1 || parsed.cc || parsed.bcc || address === undefined) throw new Error("not exactly one recipient");
          received.push({ to: address, subject: parsed.subject ?? "", text: (parsed.text ?? "").replace(/\n$/, "") });
          done();
        }, done);
      });
    },
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  closers.push(() => server.close());
  const address = server.server.address();
  if (!address || typeof address === "string") throw new Error("no SMTP port");
  const mailer = createSmtpMailer({ host: "127.0.0.1", port: address.port, from: "Aiuteur <noreply@aiuteur.test>", security: "none" });
  closers.push(() => mailer.close());
  return { mailer, delivered: async () => received, failNext: () => { failures++; } };
}

describeMailerConformance("SmtpMailer against a loopback SMTP server", smtpSubject);
