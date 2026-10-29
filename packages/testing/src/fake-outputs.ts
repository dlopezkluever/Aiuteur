import { readFile } from "node:fs/promises";
import type { OperationClass } from "@aiuteur/contract";
import { encodePng, renderMarkRaster, TEST_PROVIDER_TAG } from "./mark.ts";

export const FAKE_TONE_HZ = 1000;
export const FAKE_VIDEO_SECONDS = 2;

export type FakeOutputKind = "image" | "video" | "text";

export function outputKindOf(operationClasses: readonly OperationClass[]): FakeOutputKind {
  const classes = new Set(operationClasses);
  if (classes.size === 1 && classes.has("video.take")) return "video";
  if (classes.size > 0 && [...classes].every((c) => c === "image.frame" || c === "image.entity")) return "image";
  if (classes.size > 0 && [...classes].every((c) => c === "text.create" || c === "text.check")) return "text";
  throw new Error(`FakeTransport serves video.take, image classes or text classes, not ${[...classes].join(", ")}`);
}

const videoAsset = new URL("../assets/test-provider.mp4", import.meta.url);

/** Synthetic, watermarked output bytes: the image mark, or the marked video with its fixed tone. */
export async function fakeOutput(
  kind: Exclude<FakeOutputKind, "text">,
  operation: string,
): Promise<{ readonly contentType: string; readonly bytes: Uint8Array }> {
  if (kind === "video") return { contentType: "video/mp4", bytes: await readFile(videoAsset) };
  return {
    contentType: "image/png",
    bytes: encodePng(renderMarkRaster(), { [TEST_PROVIDER_TAG.key]: TEST_PROVIDER_TAG.value, "Aiuteur-Operation": operation }),
  };
}
