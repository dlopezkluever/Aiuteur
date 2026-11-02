import { composeWeb } from "../src/composition/staging.ts";

const running = await composeWeb(process.env, (line) => process.stdout.write(line));
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => { void running.stop().then(() => process.exit(0)); });
