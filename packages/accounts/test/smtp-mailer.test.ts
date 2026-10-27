import type { AddressInfo } from "node:net";
import { simpleParser } from "mailparser";
import { SMTPServer } from "smtp-server";
import { describeMailerConformance, type DeliveredMail } from "@aiuteur/testing";
import { createSmtpMailer } from "@aiuteur/accounts";

// A real SMTP conversation with an in-process server. The server parses the
// bytes it receives, so the suite checks what a recipient would actually read.
describeMailerConformance("SMTP, in-process server", async () => {
  const delivered: DeliveredMail[] = [];
  const server = new SMTPServer({
    secure: false,
    authOptional: true,
    disabledCommands: ["STARTTLS"],
    logger: false,
    onRcptTo(address, _session, callback) {
      if (address.address.split("@")[0] === "refuse") return callback(new Error("recipient refused"));
      callback();
    },
    onData(stream, _session, callback) {
      simpleParser(stream).then((mail) => {
        const to = mail.to && "value" in mail.to ? mail.to.value[0]?.address ?? "" : "";
        // mailparser keeps the body's final line break; the recipient reads the same text without it.
        delivered.push({ to, subject: mail.subject ?? "", text: (mail.text ?? "").replace(/\n$/, "") });
        callback();
      }, callback);
    },
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.server.address() as AddressInfo;
  return {
    mailer: createSmtpMailer({ host: "127.0.0.1", port, secure: false, from: "Aiuteur <no-reply@aiuteur.test>" }),
    async delivered() { return [...delivered]; },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
});
