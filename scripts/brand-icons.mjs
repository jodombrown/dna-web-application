// Regenerates every derived icon in ruling 184's asset contract from one source file.
//
// The contract's point is that a brand change is a file replacement, not a code change. So the
// wordmark and the icon each have exactly one source on disk, and everything else is derived:
//
//   public/favicon.png  ->  public/apple-touch-icon.png   180, flattened
//                           public/icon-192.png           192, maskable safe area
//                           public/icon-512.png           512, maskable safe area
//
// Usage:  bun scripts/brand-icons.mjs [source]
//   source defaults to public/favicon.png. Pass a path to seed from new artwork, e.g.
//   bun scripts/brand-icons.mjs ~/new-icon.png, which also rewrites public/favicon.png itself.
//
// The source should be square and at least 512 wide. A non-square source is centre-cropped to its
// shorter side and the crop is reported, because silently reframing a brand mark is not this
// script's call to make.
import sharp from "sharp";
import { basename, resolve } from "node:path";

const SRC = resolve(process.argv[2] ?? "public/favicon.png");
const BG = { r: 0xfa, g: 0xf7, b: 0xf2, alpha: 1 }; // manifest background_color
const SEEDING = basename(SRC) !== "favicon.png" || resolve("public/favicon.png") !== SRC;

const meta = await sharp(SRC).metadata();
if (!meta.width || !meta.height) throw new Error(`Cannot read ${SRC}`);
console.log(`source ${SRC} ${meta.width}x${meta.height}`);

const side = Math.min(meta.width, meta.height);
if (meta.width !== meta.height) {
  console.warn(
    `WARNING: source is not square. Centre-cropping to ${side}x${side}; ` +
      `${Math.abs(meta.width - meta.height)}px comes off the ${meta.width > meta.height ? "sides" : "top and bottom"}.`,
  );
}
if (side < 512) {
  console.warn(
    `WARNING: source is ${side}px. The contract asks for 512; icon-512 will be upscaled.`,
  );
}

// One square, full-resolution master every output derives from.
const master = await sharp(SRC)
  .extract({
    left: Math.round((meta.width - side) / 2),
    top: Math.round((meta.height - side) / 2),
    width: side,
    height: side,
  })
  .png()
  .toBuffer();

if (SEEDING) {
  await sharp(master).resize(512, 512, { kernel: "lanczos3" }).png().toFile("public/favicon.png");
  console.log("wrote public/favicon.png 512x512");
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
