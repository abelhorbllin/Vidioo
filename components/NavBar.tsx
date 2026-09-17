import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-base-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">E</span>
          EditAI
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 sm:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-white">
            How it works
          </Link>
          <Link href="/#styles" className="transition-colors hover:text-white">
            Styles
          </Link>
          <Link href="/#capabilities" className="transition-colors hover:text-white">
            Capabilities
          </Link>
        </nav>
        <Link href="/app" className="btn-primary !px-5 !py-2 text-sm">
          Create an edit
        </Link>
      </div>
    </header>
  );
}
