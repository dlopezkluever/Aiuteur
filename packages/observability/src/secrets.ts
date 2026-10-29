const REDACTION = "[scrubbed]";
/** Values shorter than this are not registered: replacing them would mangle ordinary text. */
const MIN_SECRET_LENGTH = 8;

/**
 * SC2 (OPERATIONAL-BASELINE §11): every known secret value is registered once at boot, and the logger and the error
 * scrubber replace it wherever it still appears. The typed field set is the first defence; this is the second.
 */
export interface SecretRegistry {
  add(value: string | undefined): void;
  scrub(text: string): string;
}

export function createSecretRegistry(initial: readonly (string | undefined)[] = []): SecretRegistry {
  const values = new Set<string>();
  const registry: SecretRegistry = {
    add(value) { if (value !== undefined && value.length >= MIN_SECRET_LENGTH) values.add(value); },
    // Longest first, so a secret that contains another is replaced whole.
    scrub: (text) => [...values].sort((a, b) => b.length - a.length).reduce((out, value) => out.replaceAll(value, REDACTION), text),
  };
  for (const value of initial) registry.add(value);
  return registry;
}
