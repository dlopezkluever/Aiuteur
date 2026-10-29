import { scanSecrets } from "../src/secrets.ts";

const findings = scanSecrets(process.cwd());
for (const f of findings) console.error(`${f.path}:${f.line}: ${f.shape}`);
if (findings.length > 0) process.exit(1);
console.log("secret scan: no findings");
