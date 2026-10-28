import type { RenderedRequest } from "@aiuteur/contract";
import { sha256 } from "./profile.ts";

// Draft FC10: a dialect is data plus one pure function (GENERATION-PACKAGE §10.1). It may
// arrange, wrap and encode, never add content (§10.2): the only text it adds is its
// declared wrapper, so stripping the wrapper recovers each layer exactly (guard P4).

export interface Dialect {
  readonly id: string;
  readonly version: number;
  /** Text before and after each carried layer; `{key}` is the layer key. Parts are concatenated in order with nothing between. */
  readonly wrapper: { readonly open: string; readonly close: string };
}

export interface DialectInput {
  readonly layers: readonly { readonly key: string; readonly text: string }[];
  readonly parameters: RenderedRequest["parameters"];
  readonly rewrites: readonly string[];
}

/** The provider-neutral text dialect. Provider wire encodings belong to adapters, not here. */
export const NEUTRAL_TEXT_DIALECT: Dialect = Object.freeze({
  id: "neutral-text",
  version: 1,
  wrapper: Object.freeze({ open: "[[{key}]]\n", close: "\n[[/{key}]]\n" }),
});

const DIALECTS: ReadonlyMap<string, Dialect> = new Map([[NEUTRAL_TEXT_DIALECT.id, NEUTRAL_TEXT_DIALECT]]);

/** The dialect a profile names, or undefined; the Catalogue refuses a profile naming an unknown one at load (F10). */
export function dialectFor(ref: { readonly id: string; readonly version: number }): Dialect | undefined {
  const found = DIALECTS.get(ref.id);
  return found?.version === ref.version ? found : undefined;
}

const fill = (template: string, key: string) => template.replaceAll("{key}", key);

/** The declared wrapper around one layer's text. */
export function wrap(dialect: Dialect, key: string, text: string): string {
  return fill(dialect.wrapper.open, key) + text + fill(dialect.wrapper.close, key);
}

/** Strips the declared wrapper of one text part; null when the part is not wrapped as declared. */
export function unwrap(dialect: Dialect, key: string, text: string): string | null {
  const open = fill(dialect.wrapper.open, key);
  const close = fill(dialect.wrapper.close, key);
  return text.length >= open.length + close.length && text.startsWith(open) && text.endsWith(close)
    ? text.slice(open.length, text.length - close.length)
    : null;
}

/** Renders fitted layers in order. Each text part carries its layer key and the digest of the layer text it carries. */
export function render(dialect: Dialect, input: DialectInput): RenderedRequest {
  return {
    textParts: input.layers.map((layer) => ({ layerKey: layer.key, text: wrap(dialect, layer.key, layer.text), layerDigest: sha256(layer.text) })),
    mediaParts: [],
    parameters: { ...input.parameters },
    rewrites: [...input.rewrites],
  };
}
