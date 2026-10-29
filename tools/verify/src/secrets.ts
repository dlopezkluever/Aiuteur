import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// VC1 secret scan. Shapes of credentials that have a recognisable form; a creator's own key never
// reaches the repository (Vault), so a hit is a leak to fix, not to allow-list. A test value is
// labelled "synthetic" (the repository's convention), and only the generic assignment shape honours that.
const SECRET_SHAPES: readonly { readonly name: string; readonly pattern: RegExp }[] = [
  { name: "private key block", pattern: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/ },
  { name: "AWS access key id", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { name: "Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "provider-style secret key", pattern: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/ },
  { name: "Stripe key", pattern: /\b[rs]k_live_[A-Za-z0-9]{20,}\b/ },
  { name: "credential in a connection URL", pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@"'`]+:[^\s@"'`]{6,}@(?!localhost\b|127\.0\.0\.1\b)[^\s/"'`]+/i },
  { name: "assigned secret literal", pattern: /\b(?:api[_-]?key|secret|passw(?:or)?d|token)\w*["']?\s*[:=]\s*["'](?![^"']*synthetic)[A-Za-z0-9+/_=-]{24,}["']/i },
];
/** Tracked files that are generated or binary and hold no authored text. */
const NOT_SCANNED = /(^|\/)(pnpm-lock\.yaml|schema\.json)$|\.(png|jpe?g|gif|webp|mp4|mov|wav|mp3|ico|woff2?)$/;

export interface SecretFinding { readonly path: string; readonly line: number; readonly shape: string }

/** Scans every tracked file under `root` (git is the source of the file list, so ignored files are not read). */
export function scanSecrets(root: string): SecretFinding[] {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 1 << 28 }).toString().split("\0").filter(Boolean);
  const findings: SecretFinding[] = [];
  for (const path of tracked) {
    if (NOT_SCANNED.test(path)) continue;
    let text: string;
    try { text = readFileSync(join(root, path), "utf8"); } catch { continue; }
    if (text.includes("\0")) continue;
    text.split("\n").forEach((line, index) => {
      for (const { name, pattern } of SECRET_SHAPES) if (pattern.test(line)) findings.push({ path, line: index + 1, shape: name });
    });
  }
  return findings;
}
