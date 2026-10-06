import fs from "node:fs";
import zlib from "node:zlib";

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const nx = x / (size - 1);
      const ny = y / (size - 1);
      const inset = 0.12;
      const radius = 0.22;
      const inside = rounded(nx, ny, inset, 1 - inset, inset, 1 - inset, radius);
      const line = trend(nx, ny);
      const [r, g, b, a] = inside ? (line ? [236, 245, 232, 255] : [47, 110, 78, 255]) : [0, 0, 0, 0];
      const index = row + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }
  return encode(size, raw);
}

function rounded(x, y, left, right, top, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function trend(x, y) {
  const points = [
    [0.28, 0.68],
    [0.42, 0.58],
    [0.56, 0.48],
    [0.74, 0.36],
  ];
  return points.some(([px, py]) => Math.abs(x - px) < 0.035 && Math.abs(y - py) < 0.035);
}

function encode(size, raw) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

fs.writeFileSync(new URL("../public/icon-192.png", import.meta.url), png(192));
fs.writeFileSync(new URL("../public/icon-512.png", import.meta.url), png(512));
