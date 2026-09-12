// Génère les icônes PNG noir et blanc de l'app : tirelire dessinée en primitives
// géométriques, rendue avec suréchantillonnage 4×4, encodée en PNG via zlib.
// Aucune dépendance : node make-icon.js [dossier de sortie]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------------- encodeur PNG ---------------- */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })();
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgb) {                    // rgb : Buffer w*h*3
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;                      // filtre 0 (aucun)
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8 bits, RVB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- primitives, dans un carré de 100×100 ---------------- */
const ell = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const cir = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
function rrect(x, y, cx, cy, hw, hh, r, deg = 0) {  // rectangle à coins arrondis, pivoté
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
function seg(x, y, ax, ay, bx, by, r) {            // capsule : segment épaissi
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= r;
}
// triangle aux coins arrondis : le triangle, gonflé de r par ses trois côtés
const rtri = (x, y, ax, ay, bx, by, cx2, cy2, r) =>
  tri(x, y, ax, ay, bx, by, cx2, cy2) ||
  seg(x, y, ax, ay, bx, by, r) || seg(x, y, bx, by, cx2, cy2, r) || seg(x, y, cx2, cy2, ax, ay, r);
function arc(x, y, cx, cy, R, th, a0, a1) {        // portion d'anneau, angles en degrés
  const d = Math.hypot(x - cx, y - cy);
  if (d > R + th / 2 || d < R - th / 2) return false;
  let a = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
  while (a < a0) a += 360;
  return a <= a1;
}

/* ---------------- la tirelire ---------------- */
// Un cochon tourné vers la gauche, une pièce au-dessus de la fente : corps,
// museau, oreille, pattes, avec la fente, l'œil et le naseau évidés.
// Dessiné dans un carré de 100, puis décalé pour centrer la masse du dessin.
function piggy(px, py, opt) {
  const x = px - 3, y = py - 2;
  const white =
    ell(x, y, 52, 52, 27, 21) ||                   // corps
    ell(x, y, 24, 55, 10.5, 8.5) ||                // museau
    rtri(x, y, 36.5, 37, 45.5, 34.5, 41.5, 26, 1.8) || // oreille
    rrect(x, y, 36, 71, 5, 6.5, 2.5) ||            // patte avant
    rrect(x, y, 63, 71, 5, 6.5, 2.5) ||            // patte arrière
    (opt.tail === 'ring' && arc(x, y, 80, 44, 5, 3, 20, 340)) ||
    (opt.tail === 'curl' && (arc(x, y, 79, 46, 4, 2.6, -50, 170) ||
                             arc(x, y, 82.5, 41.5, 2.7, 2.3, -150, 110))) ||
    (opt.coin && cir(x, y, 60, 19, 6.5));          // pièce au-dessus de la fente
  const cut =
    rrect(x, y, 58, 36, 9, 2.4, 2.4, -10) ||       // fente à monnaie
    cir(x, y, 33.5, 47.5, 2.7) ||                  // œil
    cir(x, y, 18.5, 54, 1.6);                      // naseau
  return white && !cut;
}

function render(size, opt) {
  const SS = 4, buf = Buffer.alloc(size * size * 3);
  const bg = opt.bg, fg = opt.fg;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = ((px + (sx + .5) / SS) / size) * 100, y = ((py + (sy + .5) / SS) / size) * 100;
        if (piggy(x, y, opt)) hit++;
      }
      const a = hit / (SS * SS), o = (py * size + px) * 3;
      for (let c = 0; c < 3; c++) buf[o + c] = Math.round(bg[c] + (fg[c] - bg[c]) * a);
    }
  }
  return encodePNG(size, size, buf);
}

const out = process.argv[2] || __dirname;
const opt = { bg: [17, 17, 17], fg: [255, 255, 255], coin: true, tail: 'none' };
for (const s of [180, 192, 512]) {
  const f = path.join(out, 'icon-' + s + '.png');
  fs.writeFileSync(f, render(s, opt));
  console.log(f, fs.statSync(f).size + ' o');
}
if (process.argv.includes('--previews')) {
  fs.writeFileSync(path.join(out, 'preview.png'), render(384, opt));
  fs.writeFileSync(path.join(out, 'preview-48.png'), render(48, opt));
  fs.writeFileSync(path.join(out, 'preview-inverse.png'), render(384, { ...opt, bg: [255, 255, 255], fg: [17, 17, 17] }));
  console.log('aperçus écrits');
}
