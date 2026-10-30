import { execFileSync } from "node:child_process";

/**
 * A synthetic still image made by ffmpeg (a solid colour with a moving test pattern overlay), for upload tests. The bytes
 * differ by colour, size and format, and decode independently of `media`'s own probe.
 */
export function syntheticImage(options: { readonly width: number; readonly height: number; readonly format: "png" | "mjpeg" | "webp"; readonly colour?: string }): Uint8Array {
  const { width, height, format } = options;
  const muxer = format === "mjpeg" ? "image2pipe" : format === "png" ? "image2pipe" : "webp";
  return new Uint8Array(execFileSync("ffmpeg", [
    "-v", "error", "-f", "lavfi", "-i", `testsrc2=size=${width}x${height}:rate=1,drawbox=c=${options.colour ?? "orange"}@0.6:t=fill`,
    "-frames:v", "1", "-c:v", format === "webp" ? "libwebp" : format, "-f", muxer, "-",
  ], { maxBuffer: 16 * 1024 * 1024 }));
}
