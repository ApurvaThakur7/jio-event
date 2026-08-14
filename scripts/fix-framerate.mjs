// Re-encodes every generated clip to a strict constant frame rate.
//
// fal's image-to-video models (Seedance included) emit variable-frame-rate mp4s.
// Remotion's Rust compositor seeks by frame index assuming CFR, so on a VFR file it
// throws "No frame found at position N" partway through a render. Re-encoding once
// here (instead of fighting it at render time) fixes every future render for free.
//
// Skip detection is by CONTENT HASH of the current clip, not by whether a .raw.mp4
// backup file merely exists. An earlier version checked existence only, which meant
// re-running generate.mjs on a shot silently left the OLD raw backup in place — this
// script then "fixed" that stale backup instead of the freshly generated clip, quietly
// re-encoding and re-serving footage that had already been thrown away. Hashing the
// current file's bytes and comparing against what was fixed last time makes that
// class of bug structurally impossible: a changed clip always has a changed hash.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const DIR = "remotion/public/clips";
const STATE_FILE = "out/.fps-fix-cache.json";
const FPS = 30;

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter(a => !a.startsWith("--"));

const sha1 = async path => createHash("sha1").update(await readFile(path)).digest("hex");

let state = {};
try { state = JSON.parse(await readFile(STATE_FILE, "utf8")); } catch { /* first run */ }

const files = (await readdir(DIR)).filter(
  f => f.endsWith(".mp4") && !f.endsWith(".raw.mp4") && !f.includes(".tmp.")
);
const targets = only.length ? files.filter(f => only.some(o => f === `${o}.mp4`)) : files;

if (!targets.length) {
  console.log(only.length ? `No clip matches: ${only.join(", ")}` : "No clips found.");
  process.exit(only.length ? 1 : 0);
}

console.log(`Checking ${targets.length} clip(s) for constant ${FPS}fps\n`);

for (const file of targets) {
  const shotId = file.replace(/\.mp4$/, "");
  const out = join(DIR, file);
  const raw = join(DIR, `${shotId}.raw.mp4`);

  const currentHash = await sha1(out);
  if (!force && state[shotId]?.sourceHash === currentHash) {
    console.log(`  skip    ${file} (unchanged since last fix)`);
    continue;
  }

  // Whatever's in `out` right now is the true current source — always overwrite the
  // backup with it rather than trusting a possibly-stale one from a previous run.
  await run(process.execPath, ["-e", `require("fs").copyFileSync(${JSON.stringify(out)}, ${JSON.stringify(raw)})`]);

  const tmp = `${out}.tmp.mp4`;
  await run(ffmpegPath, [
    "-y", "-i", raw,
    "-r", String(FPS),
    "-vsync", "cfr",
    // ultrafast + capped threads: this machine runs close to its memory commit limit,
    // and x264's default "medium" preset allocates lookahead buffers large enough to
    // fail malloc under that pressure. Quality cost is invisible at crf 17.
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "17", "-threads", "2",
    "-pix_fmt", "yuv420p",
    "-an",
    tmp,
  ]);
  await run(process.execPath, ["-e", `require("fs").renameSync(${JSON.stringify(tmp)}, ${JSON.stringify(out)})`]);

  state[shotId] = { sourceHash: currentHash, fixedAt: new Date().toISOString() };
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`  OK      ${file}`);
}

console.log(`\nDone. Originals kept as *.raw.mp4.`);
