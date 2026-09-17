import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { EDITING_STYLES } from "@/lib/styles/editingStyles";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload your footage",
    description: "Drop in raw video from your camera, phone, or screen recorder. MP4, MOV, or WEBM.",
  },
  {
    step: "02",
    title: "Describe the edit",
    description: "Tell EditAI what you want in plain language, or pick a ready-made style.",
  },
  {
    step: "03",
    title: "Get your edit",
    description: "The pipeline analyzes, cuts, captions, and renders — then you preview and export.",
  },
];

const CAPABILITIES = [
  { title: "Smart cutting", description: "Finds and keeps the moments that matter, trims the rest." },
  { title: "Silence removal", description: "Detects and removes dead air using real audio analysis." },
  { title: "Auto captions", description: "Burns in readable captions, basic or bold and dynamic." },
  { title: "Auto zoom", description: "Punches in on key moments to add energy without editing by hand." },
  { title: "Aspect ratio", description: "Reframes your footage for 9:16, 16:9, or 1:1 in one click." },
  { title: "Chat to refine", description: "Ask for changes in plain English and watch the plan update." },
];

export default function LandingPage() {
  return (
    <div className="bg-grid min-h-screen">
      <NavBar />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 text-center sm:pt-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Now in early access
        </div>
        <h1 className="animate-slide-up text-5xl font-semibold tracking-tight text-white sm:text-7xl">
          Your video.
          <br />
          <span className="bg-gradient-to-r from-accent to-fuchsia-400 bg-clip-text text-transparent">
            AI edited.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          Turn raw footage into scroll-stopping edits with AI.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/app" className="btn-primary">
            Create an edit
          </Link>
          <a href="#how-it-works" className="btn-secondary">
            See how it works
          </a>
        </div>

        {/* Visual product demo */}
        <div className="card animate-fade-in mx-auto mt-16 max-w-3xl overflow-hidden p-2 shadow-2xl shadow-accent/10">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="col-span-1 flex flex-col gap-2 rounded-xl bg-base-900 p-4 text-left">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Prompt</span>
              <p className="text-sm text-zinc-200">
                &ldquo;Fast-paced TikTok edit, remove silences, add captions, zoom on highlights.&rdquo;
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                <span className="rounded-full bg-accent/20 px-2 py-1 text-[11px] text-accent">📱 TikTok</span>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-400">9:16</span>
              </div>
            </div>
            <div className="col-span-2 flex flex-col justify-center gap-3 rounded-xl bg-base-900 p-4">
              {["Analyzing video", "Detecting silences", "Planning cuts", "Rendering"].map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      i < 3 ? "bg-accent text-white" : "border border-white/20 text-zinc-500"
                    }`}
                  >
                    {i < 3 ? "✓" : i + 1}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: i < 3 ? "100%" : "45%" }}
                    />
                  </div>
                  <span className="w-32 text-left text-xs text-zinc-400">{label}...</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold text-white">How it works</h2>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="card p-6">
              <span className="text-sm font-mono text-accent">{item.step}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI editing capabilities */}
      <section id="capabilities" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold text-white">AI editing capabilities</h2>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="card p-5">
              <h3 className="text-sm font-semibold text-white">{cap.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-400">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Editing styles */}
      <section id="styles" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold text-white">Editing styles</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zinc-400">
          Pick a starting point — each style pre-configures cuts, captions, and pacing for you.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {EDITING_STYLES.map((style) => (
            <div key={style.id} className="card flex flex-col items-center gap-2 p-5 text-center">
              <span className="text-3xl">{style.emoji}</span>
              <span className="text-sm font-semibold text-white">{style.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Example workflow */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold text-white">Example workflow</h2>
        <div className="card mt-12 grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {["Upload raw clip", "Describe + choose style", "AI generates the edit", "Preview & export"].map(
            (label, i) => (
              <div key={label} className="flex flex-col items-center gap-2 p-6 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <span className="text-sm text-zinc-300">{label}</span>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-28 pt-8 text-center">
        <div className="card p-12">
          <h2 className="text-3xl font-semibold text-white">Ready to edit at the speed of thought?</h2>
          <p className="mt-3 text-zinc-400">No timeline. No keyframes. Just describe the edit.</p>
          <Link href="/app" className="btn-primary mt-8">
            Create an edit
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-600">
        EditAI — MVP build. Demo AI mode is used unless a real AI provider is configured.
      </footer>
    </div>
  );
}
