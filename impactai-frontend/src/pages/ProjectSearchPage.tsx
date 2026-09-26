import { useState } from 'react';
import { useProjectContext } from '../hooks/useProjectContext';
import { searchApi } from '../api/search';
import type { SearchResult } from '../api/types';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { MediaThumb } from '../components/MediaThumb';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { Link } from 'react-router-dom';

export function ProjectSearchPage() {
  const { project } = useProjectContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.search(query.trim(), project.id);
      setResults(data);
      setSearchedFor(query.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. plastic waste near the river before cleanup"
          className="flex-1 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-clay"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </form>
      <p className="text-xs text-ink-muted">
        Search matches meaning, not just keywords — described tags and signals count too.
      </p>

      {loading && <Spinner label="Searching evidence…" />}
      {error && <ErrorBanner message={error} />}

      {results && results.length === 0 && (
        <EmptyState
          title={`Nothing matched "${searchedFor}"`}
          description="Try a broader description, or check that this project has evidence uploaded and analyzed."
        />
      )}

      {results && results.length > 0 && (
        <div className="space-y-3">
          {results.map(({ media, score }) => (
            <Link
              key={media.id}
              to={`/media/${media.id}`}
              className="flex gap-4 rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-md"
            >
              <MediaThumb media={media} className="h-20 w-28 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-2 text-sm text-ink">{media.description ?? media.original_filename}</p>
                  <span className="shrink-0 text-xs font-medium text-ink-muted">{Math.round(score * 100)}% match</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {media.location && <Badge tone="slate">{media.location}</Badge>}
                  {media.activity && <Badge tone="clay">{media.activity}</Badge>}
                  {media.signals.slice(0, 3).map((s) => (
                    <Badge key={s} tone="moss">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
