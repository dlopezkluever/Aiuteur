import { NO_SOURCE, scrubError, type Deployment, type ErrorContext, type ErrorSink, type ScrubbedEvent, type SecretRegistry, type SourceIndex } from "@aiuteur/observability";
import type { ErrorSinkSubject } from "./conformance/error-sink.ts";

export const KNOWN_FILE = "/app/packages/known/src/known.ts";

/** In-memory ErrorSink. The events it keeps are exactly what the scrubber lets through. */
export class FakeErrorSink implements ErrorSink {
  readonly events: ScrubbedEvent[] = [];
  readonly #deployment: Deployment;
  readonly #secrets: SecretRegistry;
  readonly #source: SourceIndex;
  constructor(deployment: Deployment, secrets: SecretRegistry, source: SourceIndex = NO_SOURCE) { this.#deployment = deployment; this.#secrets = secrets; this.#source = source; }
  capture(error: unknown, context?: ErrorContext): void { this.events.push(scrubError(error, context, this.#deployment, this.#secrets, this.#source)); }
  async flush(): Promise<void> {}
  subject(knownFile: string = KNOWN_FILE): ErrorSinkSubject {
    return { sink: this, deployment: this.#deployment, knownFile, events: async () => this.events, wire: async () => this.events.map((event) => JSON.stringify(event)) };
  }
}
