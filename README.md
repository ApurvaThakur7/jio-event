# Jio World Convention Centre — AI reel pipeline

Stills → fal.ai image-to-video → Remotion assembly with on-screen text.
Output: 1080×1920, 30fps, 12 shots × 4.5s = **54 seconds**.

---

## Run it

```bash
cd C:\Users\apurv_5ntmg0j\video-gen
```

**1. Set your fal key** (PowerShell):
```powershell
$env:FAL_KEY = "your-key-here"
```

**2. Crop the stills to 9:16** — local, free, ~5 seconds:
```bash
npm run prep
```

**3. Check the prompts before spending anything:**
```bash
npm run generate -- --dry
```

**4. Generate the clips** — 12 calls, 3 at a time:
```bash
npm run generate
```
Clips land in `remotion/public/clips/`. Results are cached by prompt hash, so re-running
only regenerates shots whose wording actually changed. To redo one shot:
```bash
npm run generate -- --force 06-jasmine
```

**5. Preview and render:**
```bash
npm run studio
```
```bash
npm run render
```
Final file: `out/jwcc-reel.mp4`

---

## What the research actually changed

**Reference reel 1** ([brad.ziemer](https://www.instagram.com/reels/DU4Qo0sDCyw/)) — *"No video footage.
Just images turned into a moving house tour."* Confirms the whole technique: you don't shoot,
you animate stills. One move per still, cut before the model drifts.

**Reference reel 2** ([shethrealty](https://www.instagram.com/reels/DbVrJRNgFYL/)) — a BKC property
reel, labelled AI content. Its copy formula is the one this reel uses: benefit line → name and
positioning → stat bullets with real numbers → CTA. That's why every text card here is a
number, not an adjective.

**Prompt construction rules**, from the Kling 3.0 camera guide and the AI-camera-moves guides:

1. **Camera verb in the first 8–10 words.** Models weight early tokens hardest. `"Slow dolly
   forward into the vast empty hall…"` not `"A beautiful hall where the camera slowly dollies…"`.
2. **One move, one direction, one speed.** Stacking moves produces mush. Every shot here has
   exactly one, with a pace word (`slow`, `very slow`).
3. **Name what must stay stable.** This is the highest-value part of an architecture prompt.
   Image-to-video fails on buildings by warping straight lines, rippling ceilings and melting
   chandeliers. Every prompt ends by naming the thing that must hold rigid — the honeycomb
   ceiling, the lotus chandeliers, the column grid.
4. **Steadicam / dolly / tracking read as real.** "Zoom" reads as software; those three read as
   a camera crew.
5. **No text in-frame.** All typography is added in Remotion, where it stays sharp, correctly
   spelled and editable without regenerating a clip.

**Pipeline shape** follows [danielrosehill/Claude-AI-Video-Producer-Plugin](https://github.com/danielrosehill/Claude-AI-Video-Producer-Plugin)
(storyboard → shot list → per-shot generation → assemble) and
[JChan2787/fal-media-pipeline](https://github.com/JChan2787/fal-media-pipeline) (config-driven
batch generation against fal). Remotion replaces their ffmpeg assembly step because this reel
needs real typography, and there's no ffmpeg on this machine.

---

## Why crop before generating

Image-to-video models frame the output from the input image. Hand a 16:9 still to a 9:16
request and you get letterboxing or an invented crop. `npm run prep` crops to 1080×1920 first,
so the vertical framing is a decision we make. Two shots use manual gravity because sharp's
`attention` strategy picked wrong: `b04` (centre clipped the lotus chandelier) and `b03`
(attention grabbed the columns and lost the walking guests the prompt depends on).

---

## Editing

- **Text** — `storyboard.json`, the `text` block on each shot. Re-render only, no regeneration.
- **Prompts** — same file, `prompt`. Changing one invalidates only that shot's cache.
- **Model** — the `model` field. Currently `fal-ai/bytedance/seedance/v1/pro/image-to-video`
  (verified schema: `aspect_ratio`, `resolution`, `duration` 2–12s, `camera_fixed`).
  Kling and Veo 3.1 take the same `prompt` + `image_url` shape if you want to compare.
- **Pace** — `shotDuration`. Remotion recalculates total length automatically.

---

## Shot list

| # | id | source | move | on-screen text |
|---|----|--------|------|----------------|
| 1 | `01-bkc` | BKC precinct aerial | aerial drift fwd | BANDRA KURLA COMPLEX / Mumbai's financial district |
| 2 | `02-square` | Dhirubhai Ambani Square, dusk | dolly in | JIO WORLD CENTRE / Dhirubhai Ambani Square |
| 3 | `03-arrival` | Grand concourse, guests | steadicam fwd | INDIA'S LARGEST / convention centre |
| 4 | `04-concourse` | Multi-storey concourse | tilt up | MULTI-STOREY CONCOURSES |
| 5 | `05-prefunction` | Pre-function hall | steadicam fwd | 32,163 SQ. M. / under one roof |
| 6 | `06-jasmine` | Jasmine Hall, pillarless | dolly fwd | JASMINE HALLS / 10,000 sq. m. pillarless |
| 7 | `07-summit` | Summit config, country flags | truck right | BUILT FOR / global summits |
| 8 | `08-conference` | "NOW & NEXT" conference | dolly fwd | 3,000+ EVENTS / hosted since 2022 |
| 9 | `09-summit-live` | Digital Health Summit 2025 | push in | 4 MILLION GUESTS / through the doors |
| 10 | `10-pavilion` | Exhibition pavilion | dolly fwd | 3 PAVILIONS / 1,61,400 sq. ft. |
| 11 | `11-lotus` | Lotus Ballroom | orbit left | THE LOTUS BALLROOM / 3,200 guests |
| 12 | `12-endcard` | Chandelier corridor | dolly fwd, very slow | JIO WORLD CONVENTION CENTRE / BKC · Mumbai |

All figures verified against the venue's published specs and
[tvsdesign](https://www.tvsdesign.com/projects/project-detail/jio-world-convention-centre/),
the project architects.

---

## Before this ships

The source stills are third-party — tvsdesign, Messe Frankfurt, JustDial, the venue's own site.
Your asset board's footer flags this itself: fine as reference, not fine inside a commercial
demo shown at that venue. The pipeline doesn't care what it's fed — swap your own photographs
into `input/selected/`, keep the filenames, re-run `npm run prep`, and the problem goes away.
