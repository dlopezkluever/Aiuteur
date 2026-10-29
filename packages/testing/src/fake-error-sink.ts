import { scrubError, type Deployment, type ErrorContext, type ErrorSink, type ScrubbedEvent, type SecretRegistry } from "@aiuteur/observability";
import type { ErrorSinkSubject } from "./conformance/error-sink.ts";

/** In-memory ErrorSink. The events it keeps are exactly what the scrubber lets through. */
export class FakeErrorSink implements ErrorSink {
  readonly events: ScrubbedEvent[] = [];
  readonly #deployment: Deployment;
  readonly #secrets: SecretRegistry;
  constructor(deployment: Deployment, secrets: SecretRegistry) { this.#deployment = deployment; this.#secrets = secrets; }
  capture(error: unknown, context?: ErrorContext): void { this.events.push(scrubError(error, context, this.#deployment, this.#secrets)); }
  async flush(): Promise<void> {}
  subject(): ErrorSinkSubject {
    return { sink: this, deployment: this.#deployment, events: async () => this.events, wire: async () => this.events.map((event) => JSON.stringify(event)) };
  }
}
