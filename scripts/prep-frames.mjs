// Crops every selected still to the format declared in storyboard.json before it goes
// to the video model.
//
// Why crop first rather than asking the model for a given aspect ratio: image-to-video
// models frame the output from the input image. Hand a mismatched-aspect still to the
// model and you get letterboxing or an invented crop you did not choose. Cropping here
// means the framing is a decision we make, not one the model makes for us.
import sharp from "sharp";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const SRC = "input/selected";
const DST = "input/frames";

// Shots where the subject sits away from where `attention` would land.
// `position` follows sharp's gravity names.
const GRAVITY = {
  "a02-bkc-garden.webp": "centre",
  "b02-tvs-N279.jpg": "centre",      // symmetrical hall — dead centre is correct
  "b04-tvs-N282.jpg": "north",       // hold the lotus chandeliers, not the carpet
  "b03-tvs-N275.jpg": "centre",      // attention grabs the columns and loses the walking guests
  "b01-tvs-N221.jpg": "centre",      // symmetric reception — off-centre gravity would clip one side
  "c08-exhibition.webp": "centre",
  "d02-jd-convhall.webp": "centre",
  "b06-tvs-N280-vert.jpg": "centre", // portrait source cropped to landscape — keep the chandeliers centred
  "e01-signage-dusk.jpg": "centre",
  "e02-butterfly-stars.jpg": "south", // the canopy sits at the bottom of this frame, not the top
  "e04-staff-namaste.png": "north",   // keep faces, not the stair treads
};

const storyboard = JSON.parse(await readFile("storyboard.json", "utf8"));
const { width: W, height: H } = storyboard.format;
const wanted = new Set(storyboard.shots.map(s => s.image));

await mkdir(DST, { recursive: true });
const files = (await readdir(SRC)).filter(f => wanted.has(f));

for (const file of files) {
  const src = join(SRC, file);
  const meta = await sharp(src).metadata();
  const position = GRAVITY[file] ?? sharp.strategy.attention;

  const out = join(DST, file.replace(/\.[^.]+$/, ".jpg"));
  await sharp(src)
    .resize(W, H, { fit: "cover", position, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toFile(out);

  const upscaled = meta.width < W || meta.height < H;
  console.log(
    `  ${file.padEnd(26)} ${String(meta.width).padStart(4)}x${String(meta.height).padEnd(4)}` +
    ` -> ${W}x${H}${upscaled ? "  (upscaled — model will re-detail)" : ""}`
  );
}

console.log(`\n${files.length} frames written to ${DST}`);
if (files.length !== wanted.size) {
  const missing = [...wanted].filter(w => !files.includes(w));
  console.log(`WARNING missing from ${SRC}: ${missing.join(", ")}`);
}
