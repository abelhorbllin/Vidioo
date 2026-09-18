"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Create" },
  { href: "/trending", label: "Trending" },
  { href: "/edits", label: "My Edits" },
];

export function DashboardNav({ demoMode }: { demoMode?: string | null }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/5 px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">E</span>
            EditAI
          </Link>
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {demoMode && (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
            {demoMode}
          </span>
        )}
      </div>
    </header>
  );
}
