# EditAI (MVP) — Football Edits

Describe the football edit you want ("a 15 second dark Mbappé edit with fast
cuts, velocity, zooms on his skills and a strong effect on the goal"), let
the AI plan it, upload the clips you want used, and get back a real,
rendered edit — cut, effected, captioned, and reframed by an ffmpeg-driven
pipeline. This is a deliberately small, functional MVP: no database, no
accounts, no billing, and **no automatic footage scraping** - you always
provide the source clips.

## What actually works today

- **Prompt-first planning** — describe the edit, optionally name a player
  and pick a football style, and the AI drafts an `EditPlan` (JSON) *before*
  any footage exists. The plan is validated before it's ever used.
- **Upload clips (one or many)** — drag & drop or browse for MP4/MOV/WEBM,
  before or after describing the edit. The server validates
  extension/MIME/size, then reads real duration/resolution/fps via `ffprobe`
  and extracts a real thumbnail via `ffmpeg`, for each clip.
- **Binding** — once at least one clip is uploaded, the abstract plan is
  bound to real footage: each purpose-tagged slot (hook, dribble, skill,
  goal, celebration, ...) gets a real source clip and a real time range
  picked via the same seeded "key moment" scoring the original single-video
  pipeline used.
- **Real video engine** (`lib/video/`) — every operation genuinely invokes
  `ffmpeg`, now across **multiple source files** in one render:
  - `analyzeVideoMetadata` / `extractThumbnail` — via `ffprobe`/`ffmpeg`.
  - `detectSilenceIntervals(ForSources)` — real audio analysis via ffmpeg's
    `silencedetect` filter (not AI), per source file.
  - `cutVideo` — trims and concatenates segments, each from its own source
    file, with an optional real speed multiplier (`velocity`) per segment.
  - `removeSilences` — subtracts detected silence from the kept clips.
  - `convertAspectRatio` — crops/scales to 9:16, 16:9, or 1:1.
  - `applyZoom` — a real crop-and-scale zoom-in over requested time ranges.
  - `applyShake` — a real time-varying crop offset ("camera shake").
  - `applyFlash` — a real brief brightness spike at a time range.
  - `applyColorGrade` — a real contrast/brightness/saturation grade (the
    "dark" look).
  - `addCaptions` — burns in a real `.ass` subtitle track (via ffmpeg's
    `subtitles`/libass filter) using a bundled font, so it works with no
    system fonts installed.
  - `renderVideo` — orchestrates all of the above into one pipeline.
- **Preview, football-aware chat edits, and export** — a low-res preview
  renders first; the chat box below it understands football-flavored
  instructions ("make the goal hit harder", "add more velocity", "remove
  the shake", "make it 10 seconds") and re-renders; the export panel renders
  720p/1080p MP4 and the Download button serves the real file (with HTTP
  Range support for scrubbing).
- **Edit timeline** — visualizes the AI's narrative arc (hook → dribble →
  skill → goal → celebration, or whatever the plan actually contains) with
  icons for the real effects applied to each clip.
- **Error handling** — invalid uploads, missing projects, missing footage,
  and ffmpeg failures all surface a clean, human-readable message; the real
  error is logged server-side only.
- **The original single-video flow still works unchanged** — upload one
  video via the same uploader, and the classic real-per-video
  key-moment-analysis path (`/api/analyze`) still produces an immediately
  "ready" plan exactly as before, now also football-enriched (purposes,
  effects, player, style).

## What is simulated (Mock AI)

There is no real understanding of any video's content, and no football
action recognition, anywhere in this build. `MOCK_AI` (on by default)
drives everything AI-shaped:

- **Prompt interpretation** (`lib/ai/football.ts`) — player name, style,
  target duration, and requested effects are extracted by **keyword/regex
  matching** on the prompt text, not language understanding. "Mbappé",
  "dark", "15 second", "velocity", "shake", "goal" are string matches.
- **"Key moments" / highlight selection** — a seeded pseudo-random spread
  over each video's duration, not real scene/action detection.
- **Football "purposes"** (hook/dribble/skill/goal/celebration/...) — a
  fixed or keyword-nudged narrative arc assigned to clip slots in order,
  not detected from the footage.
- **Clip-to-slot binding** — round-robins uploaded clips across the plan's
  slots and picks a pseudo-random (seeded, "key-moment"-weighted) time range
  within each - it does not know what's actually happening in your footage.
- Caption **text** — templated phrases per purpose ("GOAL! ⚽", "🔥 Skills",
  ...), not real speech-to-text. (The captions are still *really* burned
  into the video — only the words come from a template.)
- The chat editor (`modifyEditPlan`) — keyword/regex matching on your
  instruction, not a language model.

Whenever mock mode is active, the app shows a **"Demo AI mode"** badge in
`/app`. This is intentional and load-bearing: nothing here should be
mistaken for a genuine AI analysis of your footage, and the app never
claims to have found or downloaded footage of a named player — rendering
always uses the clips you upload.

Real, non-AI signal processing (silence detection, metadata, thumbnails) is
never mocked — those numbers come from actually reading the file(s).

## What is explicitly NOT implemented (surfaced, not faked)

- **Motion blur** and **dynamic cross-fade transitions** between clips -
  cuts are always hard cuts. If your prompt mentions these, the plan's
  `unsupportedRequests` lists them and the UI shows them under "Not yet
  available" - it never silently drops or fakes the request.
- **Beat sync** - `lib/video/audio.ts` stubs a `detectBeats()` function that
  throws "not implemented" on purpose, so there's a clear place to wire up
  real audio-analysis later. Cuts are not currently timed to music.
- **Automatic footage scraping** - there is no YouTube/TikTok/Instagram/
  broadcast scraper anywhere in this codebase, and there won't be one added
  without a licensed footage provider in place. You always supply the clips.

## What needs a real AI provider to become real

- Understanding *what's actually happening* in uploaded footage (true
  action/highlight detection - actually recognizing a dribble, a goal, a
  celebration).
- Real speech-to-text for caption *content*.
- A chat editor that understands open-ended instructions instead of
  keyword-matching.
- Real beat detection for music-synced cuts.

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

Open http://localhost:3000. No API key or system `ffmpeg` install is
required — `ffmpeg-static` and `@ffprobe-installer/ffprobe` bundle real
binaries as npm dependencies.

## Environment variables

| Variable        | Default | Meaning                                                              |
| ---------------- | ------- | --------------------------------------------------------------------- |
| `AI_PROVIDER`    | `mock`  | Which `AIProvider` implementation to use. Only `mock` exists today.   |
| `MOCK_AI`        | `true`  | Forces mock mode regardless of `AI_PROVIDER`.                         |
| `MAX_UPLOAD_MB`  | `300`   | Maximum accepted upload size, in megabytes.                           |

## Project structure

```
/app
  page.tsx              landing page (football framing)
  /app/page.tsx          the combined product: idea + player + style +
                          clips on one screen -> generate -> result
  /api/plan               prompt-first: generates a draft EditPlan (no footage needed yet)
  /api/upload             validates + stores a clip, extracts metadata/thumbnail;
                           appends to an existing project when projectId is given
  /api/analyze            classic single-video path: real per-video key-moment
                           analysis + generateEditPlan (still fully supported)
  /api/edit               runs AIProvider.modifyEditPlan (the football-aware chat editor)
  /api/render             binds a draft plan to uploaded clips if needed, then
                           renders a low-res preview via the ffmpeg pipeline
  /api/export             renders the final 720p/1080p export
  /api/files/[id]         serves a stored file by opaque id (Range-aware)

/components               VideoUploader (multi-clip), EditPrompt, PlayerInput,
                           StyleSelector, AdvancedOptions, GenerationProgress,
                           EditSummary, EditTimeline, ExportPanel, AIEditChat,
                           VideoPreview, NavBar

/lib
  /ai
    types.ts              the AIProvider interface (analyze/generate/modify/
                           generateDraftEditPlan/bindDraftPlan)
    mock.ts                MockAIProvider - the only implementation today
    football.ts             football prompt parsing, narrative arc, templated
                             captions/zooms - all explicitly MOCK, documented as such
    provider.ts             factory: the ONLY place that picks a provider
    analyze.ts               analyzeVideo() / generateEditPlan() / modifyEditPlan() /
                             generateDraftEditPlan() / bindDraftPlan()
  /video
    ffmpeg.ts               ffmpeg/ffprobe setup, shared helpers
    metadata.ts              analyzeVideoMetadata(), extractThumbnail()
    render.ts                cutVideo() (multi-source), removeSilences(),
                             convertAspectRatio(), applyZoom(), applyShake(),
                             applyFlash(), applyColorGrade(), addCaptions(),
                             renderVideo()
    captions.ts               .ass subtitle file generation
    audio.ts                  detectBeats() stub - not implemented, on purpose
  /validation
    editPlan.ts              validateEditPlan() - strict for "ready" plans,
                             relaxed for abstract "draft" plans
    upload.ts                upload validation (type/size)
  /storage
    fileStore.ts              temporary on-disk files + in-memory project state
                             (now tracks a list of clips per project, not just one)
  /styles
    editingStyles.ts          12 style presets: the original 8 generic ones plus
                             6 football styles (Dark, Fast, Cinematic, Aggressive,
                             Clean, Emotional - 2 reuse existing generic styles)
  /edit
    summary.ts                EditPlan -> EditSummary (now includes player,
                             clip count, effects count, unsupported requests)

/types
  video.ts, edit.ts          shared type definitions (EditPlan gained player,
                             effects, unsupportedRequests, status, and clips
                             gained sourceClipId/purpose/effect/speed - all
                             additive)

/assets/fonts                bundled DejaVu fonts (Bitstream Vera license),
                             used for burned-in captions independent of the host
```

There is no database. `lib/storage/fileStore.ts` keeps everything in memory
(process-lifetime) plus temp files under `.data/{uploads,tmp,exports}`
(gitignored, auto-cleaned after an hour). The types and structure already
separate `users` / `projects` / `videos` / `edits` / `exports` conceptually
so a real database can be dropped in later without touching the rest of the
app.

## Connecting a real AI provider

1. Create `lib/ai/<vendor>.ts` implementing the `AIProvider` interface from
   `lib/ai/types.ts` (see `lib/ai/mock.ts` for the shape to match, including
   `generateDraftEditPlan` and `bindDraftPlan`).
2. Read the vendor's API key from an environment variable — never hardcode
   it, never send it to the client (every AI call already happens
   server-side in the API routes).
3. Add a branch in `lib/ai/provider.ts`'s `getAIProvider()` that returns your
   new provider when `AI_PROVIDER=<vendor>`.
4. Set `AI_PROVIDER=<vendor>` and unset/`false` `MOCK_AI` in your `.env`.

Nothing else needs to change — the API routes, validation, and video engine
are already provider-agnostic.

## Known limitations (by design, for this MVP)

- No accounts, no persistence beyond the current server process, no
  payments.
- Preview and export re-run the full ffmpeg pipeline independently (no
  render caching).
- Zoom is a static crop-in over a time range, not an animated Ken Burns pan;
  shake is a time-varying crop jitter, not a physically simulated camera;
  velocity is a constant per-clip speed multiplier (clamped to ffmpeg
  atempo's [0.5, 2] range), not a smooth ramp.
- Motion blur, cross-fade transitions, and beat sync are not implemented -
  see above.
- "Dynamic" captions are a bigger/bolder style, not word-by-word karaoke
  highlighting.
- Rendering runs synchronously inside the API route (fine for short MVP
  clips); moving it to a background worker/job queue is a natural next step
  before handling long videos or concurrent users at scale.
