import { readFileSync } from "node:fs";
import { skipProblems } from "../src/skips.ts";

const file = process.argv[2];
if (!file) throw new Error("usage: require-ran.ts <vitest-json-report>");
const problems = skipProblems(JSON.parse(readFileSync(file, "utf8")));
for (const p of problems) console.error(`required check did not run clean: ${p}`);
if (problems.length > 0) process.exit(1);
console.log("every required suite ran and passed; nothing skipped");
