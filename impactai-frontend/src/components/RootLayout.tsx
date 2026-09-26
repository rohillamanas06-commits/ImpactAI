import { Link, Outlet } from 'react-router-dom';

export function RootLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-8 bg-shell px-5 py-6 text-shell-ink">
        <Link to="/" className="font-serif text-xl tracking-tight">
          ImpactAI
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link to="/" className="rounded px-3 py-2 hover:bg-shell-soft">
            All projects
          </Link>
        </nav>
        <p className="mt-auto text-xs leading-relaxed text-shell-ink-muted">
          Field evidence, organized: upload photos and video, let AI tag and describe them, then search, compare,
          and report on what changed.
        </p>
      </aside>
      <main className="min-w-0 flex-1 bg-paper">
        <Outlet />
      </main>
    </div>
  );
}
