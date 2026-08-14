// Turns each prepped still into a clip via fal image-to-video, then caches the result.
//
// Clips are cached by (shot id + prompt hash + model). Re-running only regenerates shots
// whose prompt actually changed — so iterating on one shot's wording costs one shot, not twelve.
//
//   node scripts/generate.mjs                 all shots that aren't cached
//   node scripts/generate.mjs 06-jasmine      just that shot
//   node scripts/generate.mjs --force 06-jasmine   regenerate even if cached
//   node scripts/generate.mjs --dry           print what would run, spend nothing
import { fal } from "@fal-ai/client";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

// Minimal .env loader — no dependency needed for one KEY=value line.
// Falls back silently if .env doesn't exist; an already-set env var always wins.
try {
  const envFile = (await readFile(".env", "utf8")).replace(/^﻿/, "");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* no .env file */ }

const FRAMES = "input/frames";
const CLIPS = "remotion/public/clips";
const CACHE = "out/.clip-cache.json";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dry = args.includes("--dry");
const only = args.filter(a => !a.startsWith("--"));

if (!process.env.FAL_KEY && !dry) {
  console.error("FAL_KEY is not set.\n  PowerShell:  $env:FAL_KEY = \"your-key\"\n  Bash:        export FAL_KEY=your-key");
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });

const sb = JSON.parse(await readFile("storyboard.json", "utf8"));
const model = sb.model;
const aspectRatio = sb.format.aspect;

await mkdir(CLIPS, { recursive: true });
await mkdir("out", { recursive: true });

let cache = {};
try { cache = JSON.parse(await readFile(CACHE, "utf8")); } catch { /* first run */ }

// Each clip must outlast its on-screen duration by its crossfade/outro tail, or the
// dissolve runs out of source frames partway through. Seedance takes whole seconds.
const clipSeconds = shot => {
  const isLast = sb.shots[sb.shots.length - 1].id === shot.id;
  const tail = isLast ? sb.outroFadeSeconds : sb.crossfadeSeconds;
  return String(Math.min(12, Math.max(2, Math.ceil(shot.duration + tail))));
};

const key = shot => createHash("sha1")
  .update([shot.id, shot.prompt, model, clipSeconds(shot), aspectRatio, shot.image].join("|"))
  .digest("hex").slice(0, 12);

const shots = sb.shots.filter(s => only.length === 0 || only.includes(s.id));
if (only.length && !shots.length) {
  console.error(`No shot matched: ${only.join(", ")}\nAvailable: ${sb.shots.map(s => s.id).join(", ")}`);
  process.exit(1);
}

const todo = [];
for (const shot of shots) {
  const k = key(shot);
  const out = join(CLIPS, `${shot.id}.mp4`);
  const cached = cache[shot.id]?.key === k && await stat(out).then(() => true).catch(() => false);
  if (cached && !force) { console.log(`  cached  ${shot.id}`); continue; }
  todo.push({ shot, k, out });
}

if (!todo.length) { console.log("\nEverything is cached. Use --force to regenerate."); process.exit(0); }

console.log(`\n${todo.length} shot(s) to generate on ${model} (${aspectRatio})\n`);
if (dry) {
  for (const { shot } of todo) console.log(`--- ${shot.id} (${shot.camera}) @ ${clipSeconds(shot)}s\n${shot.prompt}\n`);
  process.exit(0);
}

// fal is queue-backed, so these run concurrently. Kept modest to stay clear of rate limits.
const LIMIT = 3;
const results = [];
let cursor = 0;

async function worker() {
  while (cursor < todo.length) {
    const item = todo[cursor++];
    const { shot, k, out } = item;
    const started = Date.now();
    try {
      const framePath = join(FRAMES, shot.image.replace(/\.[^.]+$/, ".jpg"));
      const bytes = await readFile(framePath);
      const url = await fal.storage.upload(new Blob([bytes], { type: "image/jpeg" }));

      const res = await fal.subscribe(model, {
        input: {
          prompt: shot.prompt,
          image_url: url,
          aspect_ratio: aspectRatio,
          resolution: "1080p",
          duration: clipSeconds(shot),
          camera_fixed: false,
        },
        logs: false,
      });

      const videoUrl = res.data?.video?.url ?? res.video?.url;
      if (!videoUrl) throw new Error("no video url in response");

      const vid = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());
      await writeFile(out, vid);

      cache[shot.id] = { key: k, model, seed: res.data?.seed ?? res.seed, generatedAt: new Date().toISOString() };
      await writeFile(CACHE, JSON.stringify(cache, null, 2));

      const secs = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`  OK      ${shot.id.padEnd(16)} ${(vid.length / 1e6).toFixed(1)} MB  ${secs}s`);
      results.push({ id: shot.id, ok: true });
    } catch (e) {
      console.log(`  FAILED  ${shot.id.padEnd(16)} ${e.message}`);
      results.push({ id: shot.id, ok: false, err: e.message });
    }
  }
}

await Promise.all(Array.from({ length: Math.min(LIMIT, todo.length) }, worker));

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} generated into ${CLIPS}`);
if (failed.length) {
  console.log(`Retry: node scripts/generate.mjs ${failed.map(f => f.id).join(" ")}`);
  process.exit(1);
}
