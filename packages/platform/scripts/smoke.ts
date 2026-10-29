import { runSmoke } from "../src/smoke.ts";

const base = process.argv[2];
if (!base) throw new Error("usage: smoke.ts <base url>");
const problems = await runSmoke(base);
if (problems.length > 0) { process.stderr.write(`smoke failed: ${problems.join("; ")}\n`); process.exit(1); }
process.stdout.write("smoke passed\n");
