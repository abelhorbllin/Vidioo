# EditAI — AI Football Edit Generator

Describe the edit you want ("a 15 second dark Mbappé edit with fast cuts,
velocity, zooms on his skills and a strong effect on the goal") and get back
a real, rendered video — **no clips required to get started**. The AI plans
the montage, footage is resolved (your own clips if you provide them,
clearly-labeled synthetic placeholder clips if you don't), and a real
ffmpeg pipeline cuts, effects, captions, and exports it. A second pillar,
**Trending**, lets you discover example edit structures and create an
original edit inspired by one (never a copy).

This is a deliberately small, functional MVP: no database, no accounts, no
billing, and **no automatic footage scraping** from any platform.

## Architecture

```
PROMPT
  |
  v
AIProvider          understands the prompt, builds an EditPlan (draft)
  |
  v
AssetProvider       resolves real footage for the plan's clips:
  |                   - your uploaded clips, if any (preferred)
  |                   - otherwise synthetic "Demo Asset Mode" clips
  v
RenderEngine        real ffmpeg: cut, effects, captions, aspect ratio
  |                   (lib/video/render.ts)
  v
PREVIEW  -->  AI CHAT (re-plans + re-renders)  -->  EXPORT
```

`TrendingProvider` is a parallel, independent abstraction that feeds the
Trending tab; "Create Similar Edit" hands its analysis to the same
AIProvider pipeline above (as a prompt + an optional exact scene-arc
override), it never touches AssetProvider or real footage directly.

## What actually works today

- **Prompt-only generation, end to end** — type a prompt, hit Generate,
  and get a real rendered video with **zero clips uploaded**. `/api/plan`
  builds an abstract plan; `/api/render` resolves it via `AssetProvider`
  (`lib/assets/`) and renders for real.
- **DemoAssetProvider** (`lib/assets/demo.ts`) — when no footage is
  uploaded, generates small synthetic placeholder clips locally with
  ffmpeg (test-pattern video, one per needed "purpose" like hook/skill/
  goal), each burned with a visible **"DEMO ASSET · ⟨PURPOSE⟩"** caption so
  it can never be mistaken for real footage. These are real video files
  that flow through the exact same render pipeline as real uploads.
- **Upload clips (optional, one or many)** — drag & drop or browse for
  MP4/MOV/WEBM, any time. The server validates extension/MIME/size, reads
  real duration/resolution/fps via `ffprobe`, and extracts a real
  thumbnail. Uploading real clips after seeing a demo-mode preview and
  re-rendering swaps the synthetic footage out for real, per-clip.
- **Real video engine** (`lib/video/render.ts`) — every operation
  genuinely invokes `ffmpeg`, across **multiple source files** in one
  render:
  - `analyzeVideoMetadata` / `extractThumbnail` — via `ffprobe`/`ffmpeg`.
  - `detectSilenceIntervals(ForSources)` — real audio analysis via
    ffmpeg's `silencedetect` filter (not AI), per source file.
  - `cutVideo` — trims and concatenates segments, each from its own
    source file, with an optional real speed multiplier (`velocity`).
  - `removeSilences` — subtracts detected silence from the kept clips.
  - `convertAspectRatio` — crops/scales to 9:16, 16:9, or 1:1.
  - `applyZoom` / `applyShake` / `applyFlash` / `applyColorGrade` — real
    crop-zoom, time-varying crop jitter, brightness spike, and
    contrast/brightness/saturation grade.
  - `addCaptions` — burns in a real `.ass` subtitle track (ffmpeg's
    `subtitles`/libass filter) with a bundled font.
  - `muteAudio` — really strips the audio track (`-an`) when "No music"
    is selected - this is a real ffmpeg pass, not a cosmetic UI toggle.
  - `renderVideo` — orchestrates all of the above into one pipeline.
- **Football-aware chat editor** — re-plans and re-renders on
  instructions like "make the goal hit harder", "add more velocity",
  "remove the shake", "make it 10 seconds", "replace Ronaldo with
  Mbappé", "I want a 2 second intro".
- **Trending tab** (`/trending`) — filterable list (platform, time range,
  sort, player, style) of `DemoTrendingProvider`'s dataset, each card
  showing stats and detected structure, clearly labeled **"Demo Trending
  Data"**.
- **Analyze + Create Similar Edit** (`/trending/[id]`) — a full structure
  breakdown (cuts, speed ramps, slow motion, zooms, shakes, flashes,
  beat moments, captions, energy, pacing, narrative arc) and a remix flow
  that picks a new player and a similarity level ("Inspired" vs. "Very
  Similar Structure"), then hands off to `/app` with a pre-filled prompt
  (and, for "Very Similar", the exact narrative arc) — it never copies or
  downloads the original video.
- **My Edits** (`/edits`) — lists every project generated on this server
  process with Open / Duplicate / Delete / Download actions.
- **Export** — real 720p/1080p MP4 render; the Download button serves the
  actual file with HTTP Range support.
- **Error handling** — invalid uploads, missing projects, missing
  footage, and ffmpeg failures all surface a clean, human-readable
  message; the real error is logged server-side only.
- **The original single-video flow still works unchanged** — upload one
  video first, and the classic real-per-video key-moment-analysis path
  (`/api/analyze`) still produces an immediately "ready" plan exactly as
  before, now also football-enriched (purposes, effects, player, style).

## What is simulated (Mock AI) — `MOCK_AI=true` by default

There is no real language understanding or football action recognition
anywhere in this build:

- **Prompt interpretation** (`lib/ai/football.ts`) — player name, style,
  target duration, and requested effects/purposes are extracted by
  **keyword/regex matching**, not an LLM. "Mbappé", "dark", "15 second",
  "velocity", "goal" are string matches, not semantic understanding.
- **"Key moments" / highlight selection** — a seeded pseudo-random spread
  over each video's duration, not real scene/action detection.
- **Football "purposes"** (hook/dribble/skill/goal/celebration/...) — a
  fixed or keyword-nudged narrative arc assigned to clip slots in order.
- **Clip-to-slot binding** — round-robins available clips across the
  plan's slots (purpose-matched for demo assets) and picks a pseudo-random
  time range within each - it does not know what's actually happening in
  any footage, real or synthetic.
- Caption **text** — templated phrases per purpose ("GOAL! ⚽", "🔥
  Skills", ...), not real speech-to-text. The burn-in itself is real;
  only the words are templated.
- The chat editor (`modifyEditPlan`) — keyword/regex matching, not a
  language model.
- **Trending data** (`lib/trending/demo.ts`) — 12 hand-authored entries
  with illustrative view/like/comment numbers. No platform is scraped or
  queried.

Whenever mock/demo mode is active, the UI shows **"Demo AI mode"**,
**"Demo Asset Mode"**, and/or **"Demo Trending Data"** badges. This is
intentional and load-bearing: nothing here should be mistaken for a
genuine AI analysis, real footage, or real trending statistics.

Real, non-AI signal processing (silence detection, metadata, thumbnails)
is never mocked.

## What is explicitly NOT implemented (surfaced, not faked)

- **Motion blur** and **dynamic cross-fade transitions** — cuts are
  always hard cuts. If your prompt mentions these, the plan's
  `unsupportedRequests` lists them and the UI shows them under "Not yet
  available".
- **Beat sync** — `lib/video/audio.ts` stubs a `detectBeats()` function
  that throws "not implemented" on purpose. Cuts are not timed to music.
- **Custom music upload** — the UI shows the option but it's disabled
  ("coming soon") rather than silently accepting a file it wouldn't use.
- **Automatic footage/trending scraping** — no YouTube/TikTok/Instagram
  scraper exists anywhere in this codebase.

## What needs a real AI provider / external API to become real

See the table below. Nothing here is wired up - `AI_PROVIDER`,
`ASSET_PROVIDER`, and `TRENDING_PROVIDER` all throw a clear error if set
to anything other than the built-in demo implementation, rather than
silently pretending to be real.

| Capability | Needed for | API options | Cost | Notes |
| --- | --- | --- | --- | --- |
| Real prompt understanding + chat | Core AI quality | Anthropic/OpenAI/Google LLM API | Pay-per-token, low for this use case | Replaces `lib/ai/mock.ts`'s regex parsing with a real model call in a new `lib/ai/<vendor>.ts` |
| Real football action recognition | Real highlight detection in uploaded footage | A video-understanding model (e.g. a multimodal LLM with video input, or a custom CV model) | Meaningfully higher cost, scales with video length | Needed before "AI finds the goal in your footage" can be true |
| Real speech-to-text for captions | Accurate caption *content* | Whisper API or similar | Pay-per-minute of audio | Caption burn-in already works; only the text source would change |
| Real beat detection | Beat-synced cuts | An onset/tempo-detection library (can run locally, no external API needed) | Free (compute only) | `lib/video/audio.ts` is the integration point |
| Real trending data | Real Trending tab | **No platform offers a public, free "trending football edits" API.** TikTok/Instagram/YouTube's official APIs expose your *own* content's stats, not open discovery of others' trending videos by topic | Would likely require a paid social-listening/analytics vendor (e.g. Brandwatch, Exolyser) | This is the one area where "real" may not be feasible without a commercial data partner |
| Real/licensed footage | Real player footage instead of demo assets | A licensed sports-footage/highlights provider (e.g. a rights-holder API) or a real video-generation API (e.g. Runway, Pika, Sora) once viable for this use case | Licensing fees or per-generation API cost | `lib/assets/` already models this as `"licensed_footage"` / `"video_generation"` AssetProvider modes - implement `lib/assets/<name>.ts` |

**Required for MVP demo:** nothing - `npm install && npm run dev` runs the
entire product with zero API keys.
**Required for production:** at minimum a real LLM for AI quality; the
rest can be added incrementally without changing the surrounding
architecture.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS, ffmpeg
(`ffmpeg-static` + `@ffprobe-installer/ffprobe`, no system install
required), no database.

## Getting started

```bash
npm install
cp .env.example .env      # optional - defaults already work
npm run dev
```

Open http://localhost:3000/app and generate an edit with just a prompt -
no upload, no API key, no system `ffmpeg` install needed.

## Environment variables

| Variable            | Default | Meaning                                                                 |
| -------------------- | ------- | ------------------------------------------------------------------------ |
| `AI_PROVIDER`        | `mock`  | Which `AIProvider` implementation to use. Only `mock` exists today.      |
| `MOCK_AI`             | `true`  | Forces mock mode regardless of `AI_PROVIDER`.                            |
| `ASSET_PROVIDER`      | `demo`  | Which `AssetProvider` implementation to use. Only `demo` exists today.   |
| `TRENDING_PROVIDER`   | `demo`  | Which `TrendingProvider` implementation to use. Only `demo` exists today.|
| `MAX_UPLOAD_MB`       | `300`   | Maximum accepted upload size, in megabytes.                              |

## Project structure

```
/app
  page.tsx                landing page (prompt-first framing)
  /app/page.tsx             Create screen: prompt + player + style + format +
                            duration + music + optional clips -> Generate -> result
  /trending/page.tsx        Trending list + filters
  /trending/[id]/page.tsx   Analyze + "Create Similar Edit"
  /edits/page.tsx           My Edits
  /api/plan                 prompt-first: generates a draft EditPlan (no footage needed)
  /api/upload                validates + stores a clip; appends to an existing
                             project when projectId is given
  /api/analyze               classic single-video path (still fully supported)
  /api/edit                  runs AIProvider.modifyEditPlan (the chat editor)
  /api/render                 resolves assets (AssetProvider) + binds + renders
  /api/export                 renders the final 720p/1080p export
  /api/files/[id]              serves a stored file by opaque id (Range-aware)
  /api/trending, /api/trending/[id]   TrendingProvider-backed
  /api/projects, /api/projects/[id]    My Edits listing/detail/delete

/components   VideoUploader (multi-clip), EditPrompt, PlayerInput, StyleSelector,
              FormatSelector, DurationSelector, MusicSelector, AdvancedOptions,
              GenerationProgress, EditSummary, EditTimeline, ExportPanel,
              AIEditChat, VideoPreview, DashboardNav, TrendingCard, TrendingFilters

/lib
  /ai
    types.ts        AIProvider interface (analyze/generate/modify/
                     generateDraftEditPlan/bindDraftPlan)
    mock.ts          MockAIProvider - the only implementation today
    football.ts       prompt parsing, narrative arc, templated captions/zooms,
                      shared bind-finishing logic - all explicitly MOCK
    provider.ts       factory: the ONLY place that picks an AIProvider
  /assets
    types.ts          AssetProvider interface (user_upload / demo /
                      video_generation / licensed_footage modes)
    demo.ts            DemoAssetProvider - generates synthetic labeled clips
    provider.ts        factory: the ONLY place that picks an AssetProvider
  /trending
    types.ts, demo.ts, provider.ts, format.ts   same pattern, for Trending
  /video
    ffmpeg.ts, metadata.ts, captions.ts, audio.ts (detectBeats stub)
    render.ts    cutVideo() (multi-source), removeSilences(), convertAspectRatio(),
                 applyZoom(), applyShake(), applyFlash(), applyColorGrade(),
                 addCaptions(), muteAudio(), renderVideo(), buildProjectSourceResolver()
  /validation     editPlan.ts (draft vs. ready), upload.ts
  /storage        fileStore.ts (multi-clip projects, listProjects/deleteProject)
  /styles         editingStyles.ts (12 presets: 8 generic + 6 football)
  /edit           summary.ts (EditPlan -> EditSummary)

/types   edit.ts, video.ts, project.ts

/assets/fonts   bundled DejaVu fonts (Bitstream Vera license), used for
                burned-in captions independent of the host
```

There is no database. `lib/storage/fileStore.ts` keeps everything in
memory (process-lifetime) plus temp files under `.data/{uploads,tmp,
exports,demo}` (gitignored, auto-cleaned after an hour). **My Edits has no
authentication - it lists every project on this server process, for every
visitor.** The types already separate `EditProject` / `EditPlan` /
`TrendingEdit` conceptually so a real database and per-user auth can be
added later without reshaping the app.

## Connecting a real provider

Same pattern for all three abstractions:

1. Create `lib/<layer>/<vendor>.ts` implementing the interface from
   `lib/<layer>/types.ts` (see the `demo.ts` in that folder for the shape).
2. Read the vendor's API key from an environment variable - never
   hardcode it, never send it to the client.
3. Add a branch in `lib/<layer>/provider.ts`'s factory function.
4. Set the corresponding env var (`AI_PROVIDER`, `ASSET_PROVIDER`, or
   `TRENDING_PROVIDER`).

Nothing else needs to change - the API routes, validation, and render
engine are already provider-agnostic.

## Known limitations (by design, for this MVP)

- No accounts, no persistence beyond the current server process, no
  payments, no privacy on My Edits (see above).
- Preview and export re-run the full ffmpeg pipeline independently (no
  render caching); demo asset stock clips *are* cached per server process.
- Zoom is a static crop-in, shake is a time-varying crop jitter (not a
  physically simulated camera), velocity is a constant per-clip speed
  multiplier (clamped to ffmpeg atempo's [0.5, 2] range) - none are
  smooth/animated ramps.
- Motion blur, cross-fade transitions, beat sync, and custom music upload
  are not implemented (see above).
- "Dynamic" captions are a bigger/bolder style, not word-by-word karaoke.
- Rendering runs synchronously inside the API route (fine for short MVP
  clips); a background worker/job queue is the natural next step before
  handling long videos or many concurrent users.
- Trending data is a fixed local dataset, not live - see the API table
  above for why a real equivalent needs a commercial data source.
