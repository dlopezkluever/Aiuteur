/** What a client shows for a closed-vocabulary value it does not know: no judgement, no colour, no icon (VC6). */
export interface NeutralReading { readonly known: false; readonly tone: "neutral"; readonly label: "Unknown" }
export type VocabularyReading<V extends string> = { readonly known: true; readonly value: V } | NeutralReading;

const NEUTRAL: NeutralReading = Object.freeze({ known: false, tone: "neutral", label: "Unknown" });

/**
 * How a client reads a closed vocabulary. A newer server may send a value this client has not heard of (vocabularies only
 * grow, SWARM §3); the client then shows it neutrally and keeps working, and never throws or guesses a meaning.
 */
export function readVocabulary<const V extends readonly string[]>(vocabulary: V, raw: unknown): VocabularyReading<V[number]> {
  return typeof raw === "string" && (vocabulary as readonly string[]).includes(raw) ? { known: true, value: raw } : NEUTRAL;
}
