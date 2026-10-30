const REDACTION = "[scrubbed]";

/**
 * SC2 (OPERATIONAL-BASELINE §11): every known secret value is registered once at boot, and the logger and the error
 * scrubber replace it wherever it still appears. The typed field set is the first defence; this is the second.
 * Fail closed: every non-empty value is registered, however short. A short secret makes output uglier, never leakier.
 */
export interface SecretRegistry {
  add(value: string | undefined): void;
  scrub(text: string): string;
}

export function createSecretRegistry(initial: readonly (string | undefined)[] = []): SecretRegistry {
  const values = new Set<string>();
  const registry: SecretRegistry = {
    add(value) { if (value !== undefined && value !== "") values.add(value); },
    // Longest first, so a secret that contains another is replaced whole.
    scrub: (text) => [...values].sort((a, b) => b.length - a.length).reduce((out, value) => out.replaceAll(value, REDACTION), text),
  };
  for (const value of initial) registry.add(value);
  return registry;
}

export const REDACTED = REDACTION;
