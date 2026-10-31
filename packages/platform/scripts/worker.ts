import { composeWorker } from "../src/composition/staging.ts";

const running = await composeWorker(process.env, (line) => process.stdout.write(line));
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => { void running.stop().then(() => process.exit(0)); });
await running.done;
