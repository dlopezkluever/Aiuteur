import { crc32, deflateSync } from "node:zlib";

// The test-provider mark (VERIFICATION-AND-OBSERVABILITY §3.2 line 7): a burned-in
// "TEST PROVIDER" frame and a metadata tag, so a leaked file is recognisable
// without any database.

export const TEST_PROVIDER_MARK = "TEST PROVIDER";
/** The metadata tag every fake output carries: a PNG tEXt keyword, and the MP4 `comment` value prefix. */
export const TEST_PROVIDER_TAG = { key: "Aiuteur-Test-Provider", value: TEST_PROVIDER_MARK } as const;

const MARK_WIDTH = 640;
const MARK_HEIGHT = 360;

// 5x7 glyphs, one string per row, "#" is ink.
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
};

const YELLOW = [255, 214, 0] as const;
const WHITE = [245, 245, 245] as const;
const INK = [0, 0, 0] as const;

export interface Raster {
  readonly width: number;
  readonly height: number;
  /** 8-bit RGB, row-major. */
  readonly rgb: Uint8Array;
}

/** Yellow and white hazard stripes with "TEST PROVIDER" in black on a white band, centred. */
export function renderMarkRaster(width = MARK_WIDTH, height = MARK_HEIGHT): Raster {
  const rgb = new Uint8Array(width * height * 3);
  const paint = (x: number, y: number, [r, g, b]: readonly [number, number, number]) => {
    const i = (y * width + x) * 3;
    rgb[i] = r;
    rgb[i + 1] = g;
    rgb[i + 2] = b;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) paint(x, y, Math.floor((x + y) / 24) % 2 === 0 ? YELLOW : WHITE);
  }

  const columns = TEST_PROVIDER_MARK.length * 6 - 1;
  const scale = Math.max(1, Math.min(Math.floor((width * 0.9) / columns), Math.floor((height * 0.5) / 7)));
  const textWidth = columns * scale;
  const textHeight = 7 * scale;
  const left = Math.floor((width - textWidth) / 2);
  const top = Math.floor((height - textHeight) / 2);

  const pad = 2 * scale;
  for (let y = Math.max(0, top - pad); y < Math.min(height, top + textHeight + pad); y++) {
    for (let x = Math.max(0, left - pad); x < Math.min(width, left + textWidth + pad); x++) paint(x, y, WHITE);
  }
  [...TEST_PROVIDER_MARK].forEach((char, index) => {
    const glyph = GLYPHS[char];
    if (glyph === undefined) throw new Error(`no glyph for ${char}`);
    glyph.forEach((row, gy) => {
      [...row].forEach((cell, gx) => {
        if (cell !== "#") return;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            paint(left + (index * 6 + gx) * scale + dx, top + gy * scale + dy, INK);
          }
        }
      });
    });
  });
  return { width, height, rgb };
}

/** Encodes a raster as an 8-bit RGB PNG with tEXt chunks. */
export function encodePng(raster: Raster, text: Readonly<Record<string, string>>): Uint8Array {
  const { width, height, rgb } = raster;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // bit depth 8, colour type RGB, deflate, no filter method, no interlace
  const scanlines = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 3 + 1)] = 0; // filter type None
    scanlines.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  }
  const textChunks = Object.entries(text).map(([key, value]) =>
    chunk("tEXt", Buffer.concat([Buffer.from(key, "latin1"), Buffer.from([0]), Buffer.from(value, "latin1")])),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    ...textChunks,
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}
