import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Test-side media oracles. Decoding uses ffmpeg, independent of the fake's own encoder;
// a missing ffmpeg fails the test rather than skipping it.

function withFile<T>(bytes: Uint8Array, name: string, use: (path: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "media-oracle-"));
  try {
    const path = join(dir, name);
    writeFileSync(path, bytes);
    return use(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export interface Rgb {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

export function decodeFirstFrame(bytes: Uint8Array, name: string): Rgb {
  return withFile(bytes, name, (path) => {
    const [width, height] = execFileSync("ffprobe", [
      "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path,
    ])
      .toString()
      .trim()
      .split(",")
      .map(Number);
    const data = execFileSync("ffmpeg", ["-v", "error", "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return { width: width!, height: height!, data };
  });
}

export function formatTags(bytes: Uint8Array, name: string): Record<string, string> {
  return withFile(bytes, name, (path) => {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format_tags", "-of", "json", path]).toString();
    return (JSON.parse(out) as { format?: { tags?: Record<string, string> } }).format?.tags ?? {};
  });
}

/** Mono 48 kHz signed 16-bit samples of the first audio stream. */
export function decodeAudio(bytes: Uint8Array, name: string): Int16Array {
  return withFile(bytes, name, (path) => {
    const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", path, "-map", "0:a:0", "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2);
  });
}

/** Signal power at one frequency (Goertzel). */
export function powerAt(samples: Int16Array, hz: number, sampleRate = 48_000): number {
  const k = (2 * Math.PI * hz) / sampleRate;
  let s1 = 0;
  let s2 = 0;
  for (const sample of samples) {
    const s0 = sample + 2 * Math.cos(k) * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - 2 * Math.cos(k) * s1 * s2;
}

/** PNG tEXt chunks, read straight from the file structure. */
export function pngTextChunks(bytes: Uint8Array): Record<string, string> {
  const buffer = Buffer.from(bytes);
  const text: Record<string, string> = {};
  for (let offset = 8; offset < buffer.length; ) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    if (type === "tEXt") {
      const data = buffer.subarray(offset + 8, offset + 8 + length);
      const nul = data.indexOf(0);
      text[data.toString("latin1", 0, nul)] = data.toString("latin1", nul + 1);
    }
    offset += 12 + length;
  }
  return text;
}

// A reader for text drawn in a 5x7 block font: the oracle for the burned-in mark.
const FONT: Readonly<Record<string, string>> = {
  " ": "00000 00000 00000 00000 00000 00000 00000",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  I: "01110 00100 00100 00100 00100 00100 01110",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  V: "10001 10001 10001 10001 10001 01010 00100",
};

/** Finds the dark text in a frame and reads it glyph by glyph. Unreadable cells read as "?". */
export function readBlockText({ width, height, data }: Rgb): string {
  const dark = (x: number, y: number) => {
    const i = (y * width + x) * 3;
    return 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]! < 100;
  };
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!dark(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return "";
  const scale = (bottom - top + 1) / 7;
  const chars = Math.round((right - left + 1 + scale) / (6 * scale));
  let text = "";
  for (let c = 0; c < chars; c++) {
    const rows: string[] = [];
    for (let gy = 0; gy < 7; gy++) {
      let row = "";
      for (let gx = 0; gx < 5; gx++) {
        const x = Math.floor(left + (c * 6 + gx + 0.5) * scale);
        const y = Math.floor(top + (gy + 0.5) * scale);
        row += dark(x, y) ? "1" : "0";
      }
      rows.push(row);
    }
    const cell = rows.join(" ");
    text += Object.entries(FONT).find(([, pattern]) => pattern === cell)?.[0] ?? "?";
  }
  return text;
}
