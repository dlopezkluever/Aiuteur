// A skipped required check fails the pipeline (VERIFICATION-AND-OBSERVABILITY §9). Vitest reports a skipped,
// todo or filtered test as a success, so the pipeline reads its JSON report and refuses anything that did not run.

/** Every test file of the active T0 gates (VC2, VC3, VC4, VC5, VC6, VC7 incl. G9, VC8, VC10, VC1 rules); each must run at least one passing test. A new gate file is added here. */
export const REQUIRED_SUITES: readonly string[] = [
  "packages/api/test/t0-01.test.ts",
  "packages/api/test/t0-02.test.ts",
  "packages/api/test/t0-03.test.ts",
  "packages/api/test/t0-04.test.ts",
  "packages/api/test/t0-05.test.ts",
  "packages/compiler/test/compiler.test.ts",
  "packages/providers/test/gate.test.ts",
  "packages/spend/test/estimate.test.ts",
  "packages/testing/test/catalogue.test.ts",
  "packages/testing/test/fake-transport.test.ts",
  "packages/testing/test/mailer.conformance.test.ts",
  "packages/testing/test/provider-transport.conformance.test.ts",
  "packages/testing/test/scheduler.conformance.test.ts",
  "packages/testing/test/store.conformance.test.ts",
  "packages/testing/test/vc10.test.ts",
  "packages/testing/test/vc6.test.ts",
  "tools/arch-rules/test/arch-rules.test.ts",
  "tools/arch-rules/test/ei12.test.ts",
  "tools/arch-rules/test/static-rules.test.ts",
  "tools/verify/test/verify.test.ts",
];

interface Report {
  readonly numFailedTests: number;
  readonly numPendingTests: number;
  readonly numTodoTests: number;
  readonly numTotalTests: number;
  readonly testResults: readonly { readonly name: string; readonly assertionResults: readonly { readonly status: string }[] }[];
}

/** Every reason this Vitest JSON report is not a complete, green run of the required suites. Empty means green. */
export function skipProblems(report: Report, required: readonly string[] = REQUIRED_SUITES): string[] {
  const problems: string[] = [];
  if (report.numTotalTests === 0) problems.push("no tests ran");
  if (report.numFailedTests > 0) problems.push(`${report.numFailedTests} failed`);
  if (report.numPendingTests > 0) problems.push(`${report.numPendingTests} skipped or pending`);
  if (report.numTodoTests > 0) problems.push(`${report.numTodoTests} todo`);
  for (const suite of required) {
    const file = report.testResults.find((r) => r.name.endsWith(`/${suite}`));
    const passed = file?.assertionResults.filter((a) => a.status === "passed").length ?? 0;
    if (passed === 0) problems.push(`required suite ${suite} ran no passing test`);
  }
  return problems;
}
