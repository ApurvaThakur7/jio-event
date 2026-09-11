// Crops every selected still to the format declared in storyboard.json before it goes
// to the video model.
//
// Why crop first rather than asking the model for a given aspect ratio: image-to-video
// models frame the output from the input image. Hand a mismatched-aspect still to the
// model and you get letterboxing or an invented crop you did not choose. Cropping here
// means the framing is a decision made once, deliberately — not one the model
// improvises per shot.
//
// sharp's "attention" gravity (its best guess at the interesting region) gets it wrong
// often enough — clipping a chandelier, losing the walking figures a prompt depends on
// — that every non-trivial crop is worth a look before spending a generation call on it.
// When one's wrong, set that shot's "cropGravity" field in storyboard.json (any sharp
// gravity name: north/south/east/west/centre, or a compass pair like "northeast") and
// re-run this script — cheap and instant, unlike redoing the crop after generating.
import sharp from "sharp";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const SRC = "input/selected";
const DST = "input/frames";

const storyboard = JSON.parse(await readFile("storyboard.json", "utf8"));
const { width: W, height: H } = storyboard.format;
const gravityByFile = Object.fromEntries(
  storyboard.shots.filter(s => s.cropGravity).map(s => [s.image, s.cropGravity])
);
const wanted = new Set(storyboard.shots.map(s => s.image));

await mkdir(DST, { recursive: true });
const files = (await readdir(SRC)).filter(f => wanted.has(f));

for (const file of files) {
  const src = join(SRC, file);
  const meta = await sharp(src).metadata();
  const position = gravityByFile[file] ?? sharp.strategy.attention;

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
