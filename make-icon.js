/* App icon generator: a white piggy bank with a coin, on a black background,
   exported at the three sizes the app uses (180, 192 and 512 px). The drawing
   stays inside the central 80% circle, so Android can crop the icon round
   without cutting it. No dependencies.

   node make-icon.js <output dir>             writes icon-180/192/512.png
   node make-icon.js <output dir> --previews  also a large, a 48 px and an inverted preview */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })();
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ell = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const cir = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
function rrect(x, y, cx, cy, hw, hh, r, deg = 0) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const px = Math.abs((x - cx) * c + (y - cy) * s), py = Math.abs(-(x - cx) * s + (y - cy) * c);
  const dx = Math.max(px - (hw - r), 0), dy = Math.max(py - (hh - r), 0);
  return px <= hw && py <= hh && dx * dx + dy * dy <= r * r + 1e-9 || (px <= hw - r && py <= hh) || (px <= hw && py <= hh - r);
}
function tri(x, y, ax, ay, bx, by, cx2, cy2) {
  const d = (bx - ax) * (cy2 - ay) - (cx2 - ax) * (by - ay);
  const s = ((bx - ax) * (y - ay) - (x - ax) * (by - ay)) / d;
  const t = ((x - ax) * (cy2 - ay) - (cx2 - ax) * (y - ay)) / d;
  return s >= 0 && t >= 0 && s + t <= 1;
}
function seg(x, y, ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= r;
}
const rtri = (x, y, ax, ay, bx, by, cx2, cy2, r) =>
  tri(x, y, ax, ay, bx, by, cx2, cy2) ||
  seg(x, y, ax, ay, bx, by, r) || seg(x, y, bx, by, cx2, cy2, r) || seg(x, y, cx2, cy2, ax, ay, r);

/* The piggy bank faces left, drawn on a 100 × 100 grid and nudged to sit
   visually centred. The coin slot, the eye and the nostril are cut out. */
function piggy(px, py) {
  const x = px - 3, y = py - 2;
  const body = ell(x, y, 52, 52, 27, 21);
  const snout = ell(x, y, 24, 55, 10.5, 8.5);
  const ear = rtri(x, y, 36.5, 37, 45.5, 34.5, 41.5, 26, 1.8);
  const frontLeg = rrect(x, y, 36, 71, 5, 6.5, 2.5);
  const backLeg = rrect(x, y, 63, 71, 5, 6.5, 2.5);
  const coin = cir(x, y, 60, 19, 6.5);
  const slot = rrect(x, y, 58, 36, 9, 2.4, 2.4, -10);
  const eye = cir(x, y, 33.5, 47.5, 2.7);
  const nostril = cir(x, y, 18.5, 54, 1.6);
  return (body || snout || ear || frontLeg || backLeg || coin) && !(slot || eye || nostril);
}

function render(size, colors) {
  const SS = 4, buf = Buffer.alloc(size * size * 3);
  const { bg, fg } = colors;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = ((px + (sx + .5) / SS) / size) * 100, y = ((py + (sy + .5) / SS) / size) * 100;
        if (piggy(x, y)) hit++;
      }
      const a = hit / (SS * SS), o = (py * size + px) * 3;
      for (let c = 0; c < 3; c++) buf[o + c] = Math.round(bg[c] + (fg[c] - bg[c]) * a);
    }
  }
  return encodePNG(size, size, buf);
}

const out = process.argv[2] || __dirname;
const colors = { bg: [17, 17, 17], fg: [255, 255, 255] };
for (const s of [180, 192, 512]) {
  const f = path.join(out, 'icon-' + s + '.png');
  fs.writeFileSync(f, render(s, colors));
  console.log(f, fs.statSync(f).size + ' bytes');
}
if (process.argv.includes('--previews')) {
  fs.writeFileSync(path.join(out, 'preview.png'), render(384, colors));
  fs.writeFileSync(path.join(out, 'preview-48.png'), render(48, colors));
  fs.writeFileSync(path.join(out, 'preview-inverse.png'), render(384, { bg: colors.fg, fg: colors.bg }));
  console.log('previews written');
}
