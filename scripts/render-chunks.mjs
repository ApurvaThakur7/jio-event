// Renders the reel in per-shot chunks and concatenates them, instead of one 1620-frame
// Remotion invocation.
//
// This machine runs close to its memory commit limit, and a whole-composition render
// launches one Chrome session that has to survive all 1620 frames — if a memory spike
// from anything else on the box lands mid-render, the whole job dies and restarts from
// frame 0. Chunking by shot means each Chrome session only has to survive ~135-150
// frames, and --frames=start-end renders using the composition's true global frame
// numbers, so each chunk's pixels are bit-identical to what a full render would have
// produced at those frames — including the crossfades, which read frames from both the
// outgoing and incoming shot regardless of which chunk boundary they fall in. Chunks
// are stitched back together with a stream-copy concat (no re-encoding, so no quality
// loss and no extra memory pressure).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const CHUNKS_DIR = "out/chunks";
const OUT = "out/jwcc-reel.mp4";
const RETRIES = 3;

const sb = JSON.parse(await readFile("storyboard.json", "utf8"));
const { fps } = sb.format;

// Each shot can now have its own duration (slow intro, slow outro, normal beats in
// between), so chunk boundaries come from a cumulative offset array rather than a
// constant stride. --frames=start-end still renders using the composition's true
// global frame numbers, so per-chunk pixels stay bit-identical to a full render.
const shotFrames = sb.shots.map(s => Math.round(s.duration * fps));
const startFrame = shotFrames.reduce((acc, f, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + shotFrames[i - 1]);
  return acc;
}, []);

const only = process.argv.slice(2).filter(a => !a.startsWith("--"));

await mkdir(CHUNKS_DIR, { recursive: true });

const shotsToRender = only.length ? sb.shots.filter(s => only.includes(s.id)) : sb.shots;
console.log(`Rendering ${shotsToRender.length}/${sb.shots.length} chunk(s)\n`);

const outroFrames = Math.round(sb.outroFadeSeconds * fps);

for (const shot of shotsToRender) {
  const i = sb.shots.indexOf(shot);
  const isLast = i === sb.shots.length - 1;
  const start = startFrame[i];
  // The last shot's fade-to-black plays out over its extended tail, past its own core
  // duration and past the end of every other shot's range — nothing else is mounted
  // there, so it has to be part of this chunk or it never gets rendered at all.
  const end = start + shotFrames[i] - 1 + (isLast ? outroFrames : 0);
  const out = join(CHUNKS_DIR, `${String(i).padStart(2, "0")}-${shot.id}.mp4`);

  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      process.stdout.write(`  [${i + 1}/${sb.shots.length}] ${shot.id} frames ${start}-${end}` + (attempt > 1 ? ` (retry ${attempt - 1})` : "") + " ... ");
      await run("npx", [
        "remotion", "render", "remotion/index.ts", "JWCCReel", out,
        `--frames=${start}-${end}`,
        "--concurrency=1",
      ], { shell: true, maxBuffer: 1024 * 1024 * 64 });
      console.log("OK");
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      console.log("FAILED");
      // A small pause lets a transient system memory spike pass before retrying.
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  if (lastErr) {
    console.error(`\nGave up on ${shot.id} after ${RETRIES} attempts.`);
    console.error(lastErr.stderr?.slice(-2000) ?? lastErr.message);
    process.exit(1);
  }
}

console.log("\nConcatenating chunks...");
const listFile = join(CHUNKS_DIR, "list.txt");
const list = sb.shots
  .map((s, i) => `file '${join(process.cwd(), CHUNKS_DIR, `${String(i).padStart(2, "0")}-${s.id}.mp4`)}'`)
  .join("\n");
await writeFile(listFile, list);

await run(ffmpegPath, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", OUT]);

console.log(`\nDone: ${OUT}`);
