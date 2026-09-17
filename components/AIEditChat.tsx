"use client";

import { useState } from "react";

interface AIEditChatProps {
  onApply: (instruction: string) => Promise<void>;
}

interface ChatEntry {
  instruction: string;
  status: "applied" | "error";
  error?: string;
}

export function AIEditChat({ onApply }: AIEditChatProps) {
  const [instruction, setInstruction] = useState("");
  const [applying, setApplying] = useState(false);
  const [history, setHistory] = useState<ChatEntry[]>([]);

  async function handleApply() {
    const text = instruction.trim();
    if (!text) return;
    setApplying(true);
    try {
      await onApply(text);
      setHistory((h) => [...h, { instruction: text, status: "applied" }]);
      setInstruction("");
    } catch (err) {
      setHistory((h) => [
        ...h,
        { instruction: text, status: "error", error: err instanceof Error ? err.message : "Failed to apply." },
      ]);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-white">Want to change something?</h3>

      {history.length > 0 && (
        <div className="mt-4 flex max-h-40 flex-col gap-2 overflow-y-auto scrollbar-thin">
          {history.map((entry, i) => (
            <div key={i} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
              <p className="text-zinc-300">&ldquo;{entry.instruction}&rdquo;</p>
              {entry.status === "applied" ? (
                <p className="mt-1 text-accent">Applied to your edit plan.</p>
              ) : (
                <p className="mt-1 text-red-400">{entry.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="Make the first 5 seconds faster and add bigger captions."
        rows={3}
        className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-base-900 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        onClick={handleApply}
        disabled={applying || !instruction.trim()}
        className="btn-secondary mt-3 w-full"
      >
        {applying ? "Applying changes..." : "Apply changes"}
      </button>
    </div>
  );
}
