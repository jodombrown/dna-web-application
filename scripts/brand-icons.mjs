// Regenerates every derived icon in ruling 184's asset contract from one source file.
//
// The contract's point is that a brand change is a file replacement, not a code change. So the
// icon has exactly one source on disk and everything else is derived:
//
//   public/favicon.png  ->  public/favicon.png            512, the square master itself
//                           public/favicon.ico            32 and 16, legacy browser tab
//                           public/apple-touch-icon.png   180, flattened
//                           public/icon-192.png           192, maskable safe area
//                           public/icon-512.png           512, maskable safe area
//
// Usage:  bun scripts/brand-icons.mjs [source]
//   With no source it re-derives from public/favicon.png and leaves that master untouched, so a
//   run is a no-op on an unchanged repo. Pass a path to seed from new artwork, e.g.
//   bun scripts/brand-icons.mjs ~/new-icon.png, which also rewrites public/favicon.png so the
//   padded square master is what lives in the repo and what every later run reads.
//
// Seeding writes brand artwork, so a seeded run belongs in its own PR with its own ruling and
// never inside a PR about something else (rulings 184, 191).
//
// A non-square source is PADDED to square, never cropped (ruling 192). Two reasons, the second
// stronger than the first. A crop pushes the mark to the tile edge, and at 16px a favicon is a
// silhouette-recognition problem where lost breathing room reads as broken rather than small. And
// while the wordmark and icon are being redesigned every asset here is provisional: padding is
// reversible, a crop destroys pixels the redesign may want back. The pad is transparent, so no
// background colour is baked into the master; the derived icons apply the brand ground only where
// they need opacity.
import sharp from "sharp";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

const SRC = resolve(process.argv[2] ?? "public/favicon.png");
const FAVICON = resolve("public/favicon.png");
const BG = { r: 0xfa, g: 0xf7, b: 0xf2, alpha: 1 }; // manifest background_color
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

const meta = await sharp(SRC).metadata();
if (!meta.width || !meta.height) throw new Error(`Cannot read ${SRC}`);
console.log(`source ${SRC} ${meta.width}x${meta.height}`);

// Pad to the LONGER side, so nothing is lost.
const side = Math.max(meta.width, meta.height);
if (meta.width !== meta.height) {
  const axis = meta.width > meta.height ? "top and bottom" : "the sides";
  console.warn(
    `source is not square: padding to ${side}x${side}, ` +
      `${Math.abs(meta.width - meta.height)}px of transparency added to ${axis}. Nothing is cropped.`,
  );
}
if (side < 512) {
  console.warn(
    `WARNING: source is ${side}px. The contract asks for 512; the larger icons are upscaled.`,
  );
}

// One square, transparent-padded master every output derives from.
const master = await sharp(SRC)
  .resize(side, side, { fit: "contain", background: CLEAR })
  .png()
  .toBuffer();

// The master is the source of record. It is written back only when seeding from new artwork:
// re-deriving from the existing favicon must never rewrite the very file it just read, which
// would upscale the master a little further on every run.
if (SRC !== FAVICON) {
  await sharp(master).resize(512, 512, { kernel: "lanczos3" }).png().toFile(FAVICON);
  console.log("wrote public/favicon.png 512x512 (the square master)");
} else {
  console.log("re-deriving from public/favicon.png; master left as is");
}

// iOS composites on black if it sees alpha, so flatten onto the brand ground.
await sharp(master)
  .resize(180, 180, { kernel: "lanczos3" })
  .flatten({ background: BG })
  .png()
  .toFile("public/apple-touch-icon.png");
console.log("wrote public/apple-touch-icon.png 180x180");

// PWA icons are declared "any maskable", so the mask may crop to a circle: keep the artwork inside
// the central 80% and pad the rest with the brand ground.
for (const size of [192, 512]) {
  const inner = Math.round(size * 0.8);
  const pad = Math.round((size - inner) / 2);
  const art = await sharp(master).resize(inner, inner, { kernel: "lanczos3" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: art, top: pad, left: pad }])
    .png()
    .toFile(`public/icon-${size}.png`);
  console.log(`wrote public/icon-${size}.png ${size}x${size}`);
}

// favicon.ico at 32 and 16 (ruling 192). Alpha is kept, so the tab icon sits on whatever chrome
// the browser paints. Payloads are PNG, which every current browser reads inside an ICO and which
// is what this repo's previous .ico used.
const sizes = [32, 16];
const pngs = await Promise.all(
  sizes.map((s) => sharp(master).resize(s, s, { kernel: "lanczos3" }).png().toBuffer()),
);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s === 256 ? 0 : s, 0); // width
  e.writeUInt8(s === 256 ? 0 : s, 1); // height
  e.writeUInt8(0, 2); // palette size
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
await writeFile("public/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));
console.log(`wrote public/favicon.ico ${sizes.join(" and ")}`);
