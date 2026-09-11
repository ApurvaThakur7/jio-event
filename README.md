# Jewelry Shop — Kanpur — AI hero video pipeline

Six of the shop's own photos → fal.ai image-to-video → Remotion assembly with on-screen
text and a music bed. Output: 1920×1080, 30fps, 6 shots, ~33s on screen.

Built with the `realestate-video` skill. Generation is the only paid step (fal.ai); the
`FAL_KEY` secret is configured on this repo and the render runs via
`.github/workflows/generate-video.yml` so no local credential is needed.

## Run it (GitHub Actions)

Trigger the **Generate hero video** workflow manually (Actions tab → workflow_dispatch)
on this branch. It will:

1. `npm run prep` — crop the 6 stills to 16:9 (free, local, already reviewed)
2. `npm run generate` — animate each still via fal.ai Seedance image-to-video (paid)
3. `npm run prep-audio` — trim/fade the music bed to the video length
4. `npm run fix-fps` — normalize clip framerates before assembly
5. `npm run render:chunks` — render per-shot chunks and concatenate (memory-safe)
6. Commit the finished `out/reel.mp4` back to this branch and upload it as a workflow
   artifact

## Run it locally instead

```bash
npm install
npm run prep
export FAL_KEY=your-fal-key
node scripts/generate.mjs --dry   # print prompts, spend nothing
npm run generate
npm run prep-audio
npm run fix-fps
npm run render:chunks
```
Final file: `out/reel.mp4`

## Creative choices this run made

- **Arc**: a condensed Feature Tour (establishing → arrival → feature → product detail →
  human beat → endcard) — chosen because the photo set has five strong interior/product
  shots and one human/bridal shot, with no crowd or event photography to build a
  Proof-First or full Arrival arc from.
- **Text voice**: benefit-led throughout. No fabricated stats — the shop didn't have
  sourced figures (years established, certifications) to put on screen, so every card
  leads with the viewer benefit instead of a number.
- **Pacing**: Editorial Standard timing (slow crossfades, 0.7s; generous intro/outro
  fades) scaled down to 6 shots rather than padded to the preset's normal 10–14 shot
  range — ~33 seconds on screen, matching the "short cinematic website hero" brief.
- **Camera moves**: one distinct move per shot (ground-level push, steadicam advance,
  lateral glide, tilt, gentle hold-push, slow dolly forward on the endcard) — no move
  repeated, "slow"/"very slow" held throughout for a consistent premium feel.
- **CTA placement**: "Where Every Sparkle Tells Your Story" lands as the line on the
  bridal/human beat, immediately before the pure name + location end card.

## Shot list

| # | id | source | move | on-screen text |
|---|----|--------|------|----------------|
| 1 | `01-showroom-wide` | Grand showroom, arches & chandelier | push in, slow | CRAFTED TO BE TREASURED FOREVER / step inside our showroom |
| 2 | `02-lounge` | Reception lounge | steadicam forward, slow | WHERE EVERY VISIT FEELS LIKE A CELEBRATION |
| 3 | `03-shopfloor` | Shop floor, counters | lateral glide right, slow | A COLLECTION CURATED FOR EVERY STORY / browse in comfort, choose with confidence |
| 4 | `04-necklace-detail` | Necklace display | tilt up, slow | EVERY PIECE, HANDCRAFTED WITH CARE / gold and gemstones set to last generations |
| 5 | `05-bridal` | Bridal portrait | push in, very slow | FOR YOUR MOST PRECIOUS MOMENTS / Where Every Sparkle Tells Your Story |
| 6 | `06-endcard` | Arched display niches | dolly forward, very slow | JEWELRY SHOP / KANPUR |

## Copyright note

All 6 source photos were confirmed by the shop as their own (including two that carry
third-party watermarks/branding visible in the original images — the shop confirmed
ownership of those fixtures/images before this run proceeded).

## Editing

- **Text** — `storyboard.json`, the `text` block on each shot. Re-render only, no
  regeneration needed.
- **Prompts** — same file, `prompt`. Changing one invalidates only that shot's cache.
- **Crop framing** — `cropGravity` per shot (see `scripts/prep-frames.mjs`). The bridal
  shot uses `"north"` to keep the face, headpiece, and incense smoke in frame instead of
  the default attention-crop, which centered on the torso.
