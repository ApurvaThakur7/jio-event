// Trims the source music to exactly the reel's total runtime, with fades matching the
// video's own intro/outro fades so sound and picture land together.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir } from "node:fs/promises";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const OUT_DIR = "remotion/public/audio";
const OUT = `${OUT_DIR}/theme.mp3`;

const sb = JSON.parse(await readFile("storyboard.json", "utf8"));
const totalSeconds = sb.shots.reduce((sum, s) => sum + s.duration, 0) + sb.outroFadeSeconds;
const { fadeInSeconds, fadeOutSeconds, source } = sb.audio;
const fadeOutStart = totalSeconds - fadeOutSeconds;

await mkdir(OUT_DIR, { recursive: true });

await run(ffmpegPath, [
  "-y", "-i", source,
  "-t", String(totalSeconds),
  "-af", `afade=t=in:st=0:d=${fadeInSeconds},afade=t=out:st=${fadeOutStart}:d=${fadeOutSeconds}`,
  "-c:a", "libmp3lame", "-b:a", "192k",
  OUT,
]);

console.log(`theme.mp3 written: ${totalSeconds.toFixed(1)}s (fade in ${fadeInSeconds}s, fade out ${fadeOutSeconds}s from ${fadeOutStart.toFixed(1)}s) -> ${OUT}`);
