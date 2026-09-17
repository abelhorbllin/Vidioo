# EditAI (MVP)

Upload a video, describe the edit you want in plain language, and get back a
real, rendered cut — trimmed, reframed, captioned, and zoomed by an
ffmpeg-driven pipeline. This is a deliberately small, functional MVP: no
database, no accounts, no billing. It is built so those can be added later
without reshaping what's here.

## What actually works today

- **Upload** — drag & drop or browse for an MP4/MOV/WEBM. The server
  validates extension/MIME/size, then reads real duration/resolution/fps via
  `ffprobe` and extracts a real thumbnail via `ffmpeg`.
- **Describe + style + advanced options** — a prompt, one of 8 style
  presets, and aspect ratio / captions / silence removal / auto-zoom / music /
  intensity controls.
- **AI plan generation** — turns the prompt + style + options into a
  structured `EditPlan` (JSON), validated before it's ever used.
- **Real video engine** (`lib/video/`) — every operation genuinely invokes
  `ffmpeg`:
  - `analyzeVideoMetadata` / `extractThumbnail` — via `ffprobe`/`ffmpeg`.
  - `detectSilenceIntervals` — real audio analysis via ffmpeg's
    `silencedetect` filter (not AI).
  - `cutVideo` — trims and concatenates the selected clips.
  - `removeSilences` — subtracts detected silence from the kept clips.
  - `convertAspectRatio` — crops/scales to 9:16, 16:9, or 1:1.
  - `applyZoom` — a real crop-and-scale zoom-in over requested time ranges.
  - `addCaptions` — burns in a real `.ass` subtitle track (via ffmpeg's
    `subtitles`/libass filter) using a bundled font, so it works with no
    system fonts installed.
  - `renderVideo` — orchestrates all of the above into one pipeline.
- **Preview, chat-based edits, and export** — a low-res preview renders
  first; the chat box below it turns a follow-up instruction into a plan
  change and re-renders; the export panel renders 720p/1080p MP4 and the
  Download button serves the real file (with HTTP Range support for
  scrubbing).
- **Error handling** — invalid uploads, missing projects, and ffmpeg
  failures all surface a clean, human-readable message; the real error is
  logged server-side only.

## What is simulated (Mock AI)

There is no real understanding of the video's content anywhere in this
build. `MOCK_AI` (on by default) drives everything AI-shaped:

- "Key moments" / highlight selection — a seeded pseudo-random spread over
  the video's duration, not real scene/action detection.
- Caption **text** — templated phrases ("Watch this", "Here we go", ...),
  not real speech-to-text. (The captions are still *really* burned into the
  video — only the words come from a template, not from listening to the
  audio.)
- The chat editor (`modifyEditPlan`) — keyword/regex matching on your
  instruction ("dynamic", "bigger captions", "first N seconds faster", an
  aspect ratio mention, ...), not a language model.

Whenever mock mode is active, the app shows a **"Demo AI mode"** badge in
`/app`. This is intentional and load-bearing: nothing here should be
mistaken for a genuine AI analysis of your footage.

Real, non-AI signal processing (silence detection, metadata, thumbnails) is
never mocked — those numbers come from actually reading the file.

## What needs a real AI provider to become real

- Understanding *what's actually happening* in the footage (true highlight
  detection, "funny moment" detection, meaningful zoom targets).
- Real speech-to-text for caption *content*.
- A chat editor that understands open-ended instructions instead of
  keyword-matching.

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
  page.tsx              landing page
  /app/page.tsx          the 3-step product (upload -> describe -> result)
  /api/upload            validates + stores a video, extracts metadata/thumbnail
  /api/analyze           runs AIProvider.analyzeVideo + generateEditPlan
  /api/edit               runs AIProvider.modifyEditPlan (the chat editor)
  /api/render             renders a low-res preview via the ffmpeg pipeline
  /api/export             renders the final 720p/1080p export
  /api/files/[id]         serves a stored file by opaque id (Range-aware)

/components               VideoUploader, EditPrompt, StyleSelector,
                           AdvancedOptions, GenerationProgress, EditSummary,
                           ExportPanel, AIEditChat, VideoPreview, NavBar

/lib
  /ai
    types.ts              the AIProvider interface
    mock.ts                MockAIProvider - the only implementation today
    provider.ts            factory: the ONLY place that picks a provider
    analyze.ts              analyzeVideo() / generateEditPlan() / modifyEditPlan()
  /video
    ffmpeg.ts              ffmpeg/ffprobe setup, shared helpers
    metadata.ts             analyzeVideoMetadata(), extractThumbnail()
    render.ts               cutVideo(), removeSilences(), convertAspectRatio(),
                             applyZoom(), addCaptions(), renderVideo()
    captions.ts              .ass subtitle file generation
  /validation
    editPlan.ts             validateEditPlan()
    upload.ts               upload validation (type/size)
  /storage
    fileStore.ts             temporary on-disk files + in-memory project state
  /styles
    editingStyles.ts         the 8 style presets
  /edit
    summary.ts               EditPlan -> EditSummary

/types
  video.ts, edit.ts          shared type definitions

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
   `lib/ai/types.ts` (see `lib/ai/mock.ts` for the shape to match).
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
- Zoom is a static crop-in over a time range, not an animated Ken Burns pan.
- "Dynamic" captions are a bigger/bolder style, not word-by-word karaoke
  highlighting.
- Rendering runs synchronously inside the API route (fine for short MVP
  clips); moving it to a background worker/job queue is a natural next step
  before handling long videos or concurrent users at scale.
