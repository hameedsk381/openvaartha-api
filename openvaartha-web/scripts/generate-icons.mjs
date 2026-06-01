import { writeFileSync } from "fs";
import { deflateSync } from "zlib";

function createPNG(width, height, r, g, b) {
  // Minimal PNG: IHDR + IDAT (deflated raw pixel rows) + IEND
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte (none)
    for (let x = 0; x < width; x++) {
      raw.push(r, g, b, 255);
    }
  }
  const idat = deflateSync(Buffer.from(raw));

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([t, data]);
    const crc = crc32(crcData);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc);
    return Buffer.concat([len, t, data, c]);
  };

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const sizes = [
  [192, 85, 0, 0],
  [512, 85, 0, 0],
];

for (const [size, r, g, b] of sizes) {
  writeFileSync(`public/pwa-${size}x${size}.png`, createPNG(size, size, r, g, b));
  console.log(`Created public/pwa-${size}x${size}.png`);
}
