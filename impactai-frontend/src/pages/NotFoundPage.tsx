import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="font-serif text-3xl text-ink">Page not found</h1>
      <p className="text-sm text-ink-muted">There's nothing at this address.</p>
      <Link to="/" className="text-sm text-clay hover:underline">
        Back to projects
      </Link>
    </div>
  );
}
