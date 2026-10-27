// Regenerates assets/test-provider.mp4, the fake's video output: the burned-in mark
// on every frame, a fixed 1 kHz tone, and the metadata tag. Needs ffmpeg with libx264.
// Run: pnpm --filter @aiuteur/testing generate:video-asset
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, renderMarkRaster, TEST_PROVIDER_TAG } from "../src/mark.ts";
import { FAKE_TONE_HZ, FAKE_VIDEO_SECONDS } from "../src/fake-outputs.ts";

const out = fileURLToPath(new URL("../assets/test-provider.mp4", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "test-provider-"));
try {
  const frame = join(dir, "mark.png");
  writeFileSync(frame, encodePng(renderMarkRaster(), {}));
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-loop", "1", "-framerate", "24", "-i", frame,
    "-f", "lavfi", "-i", `sine=frequency=${FAKE_TONE_HZ}:sample_rate=48000`,
    "-t", String(FAKE_VIDEO_SECONDS),
    "-map", "0:v", "-map", "1:a",
    "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "64k",
    "-map_metadata", "-1",
    "-metadata", `title=${TEST_PROVIDER_TAG.value}`,
    "-metadata", `comment=${TEST_PROVIDER_TAG.key}: ${TEST_PROVIDER_TAG.value}`,
    "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
    "-movflags", "+faststart",
    out,
  ]);
  console.log(`wrote ${out}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
