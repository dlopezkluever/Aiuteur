import { runSmoke } from "../src/smoke.ts";

// The smoke login is the only secret this process reads, passed by the deploy script for this one run (`docker exec --env-file`).
const [base] = process.argv.slice(2);
const { SMOKE_EMAIL: email, SMOKE_PASSWORD: password, SMOKE_ACCOUNT_ID: accountId, SMOKE_ORIGIN: origin } = process.env;
if (!base) throw new Error("usage: smoke.ts <base url>");
if (!email || !password || !accountId || !origin) { process.stderr.write("smoke failed: SMOKE_EMAIL, SMOKE_PASSWORD, SMOKE_ACCOUNT_ID and SMOKE_ORIGIN are required (the staging smoke Account is not configured)\n"); process.exit(1); }
const problems = await runSmoke(base, { email, password, accountId, origin });
// Exit 3: the service is not ready yet (deep health), so the deploy may try again. Exit 1: a real failure, which it must not retry.
if (problems.length > 0) { process.stderr.write(`smoke failed: ${problems.join("; ")}\n`); process.exit(problems[0]!.startsWith("/healthz/deep") ? 3 : 1); }
process.stdout.write("smoke passed\n");
