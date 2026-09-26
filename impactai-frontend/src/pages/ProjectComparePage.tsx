import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectContext } from '../hooks/useProjectContext';
import { useAsync } from '../hooks/useAsync';
import { mediaApi } from '../api/media';
import { compareApi } from '../api/compare';
import type { CompareResponse, Media } from '../api/types';
import { ApiError } from '../api/client';
import { MediaCard } from '../components/MediaCard';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/format';

export function ProjectComparePage() {
  const { project } = useProjectContext();
  const { data: media, loading, error } = useAsync(() => mediaApi.list(project.id), [project.id]);
  const { data: history, refetch: refetchHistory } = useAsync(() => compareApi.list(project.id), [project.id]);

  const [before, setBefore] = useState<Media | null>(null);
  const [after, setAfter] = useState<Media | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // step 1 = picking before, step 2 = picking after
  const step = before === null ? 1 : 2;

  function reset() {
    setBefore(null);
    setAfter(null);
    setResult(null);
    setCompareError(null);
  }

  async function runCompare() {
    if (!before || !after) return;
    setComparing(true);
    setCompareError(null);
    setResult(null);
    try {
      const res = await compareApi.compare(before.id, after.id);
      setResult(res);
      refetchHistory();
    } catch (err) {
      setCompareError(
        err instanceof ApiError
          ? err.message
          : 'Comparison failed — Gemini needs to fetch both images, so check the backend is configured.',
      );
    } finally {
      setComparing(false);
    }
  }

  if (loading) return <Spinner label="Loading evidence…" />;
  if (error) return <ErrorBanner message={error} />;
  if (media && media.length < 2) {
    return (
      <EmptyState
        title="Need at least two pieces of evidence"
        description="Upload a 'before' and an 'after' photo of the same location to compare them."
      />
    );
  }

  const allMedia = media ?? [];

  return (
    <div className="space-y-8">
      {/* ── Step indicator ── */}
      <div className="flex items-center gap-3">
        <StepBadge n={1} active={step === 1} done={!!before} label="Pick Before" />
        <div className="h-px w-6 bg-border" />
        <StepBadge n={2} active={step === 2} done={!!after} label="Pick After" />
      </div>

      {/* ── Selected thumbnails summary bar ── */}
      {(before || after) && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
          <SlotThumb label="Before" media={before} onClick={() => { setBefore(null); setAfter(null); }} />
          <span className="text-ink-muted">→</span>
          <SlotThumb label="After" media={after} onClick={() => setAfter(null)} />
          {before && after && (
            <div className="ml-auto flex items-center gap-2">
              <Button onClick={runCompare} disabled={comparing}>
                {comparing ? 'Analyzing…' : 'Compare'}
              </Button>
              <button onClick={reset} className="text-xs text-ink-muted underline hover:text-ink">
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {compareError && <ErrorBanner message={compareError} />}

      {/* ── Step 1: pick Before ── */}
      {step === 1 && (
        <div>
          <p className="mb-4 text-sm text-ink-muted">
            Click the <strong>earlier</strong> photo to set it as <strong>Before</strong>.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {allMedia.map((m) => (
              <MediaCard key={m.id} media={m} selectable selected={false} onSelect={setBefore} />
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: pick After ── */}
      {step === 2 && (
        <div>
          <p className="mb-4 text-sm text-ink-muted">
            Now click the <strong>later</strong> photo to set it as <strong>After</strong>.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {allMedia.filter((m) => m.id !== before?.id).map((m) => (
              <MediaCard key={m.id} media={m} selectable selected={after?.id === m.id} onSelect={setAfter} />
            ))}
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="grid grid-cols-2 gap-4">
            <img src={result.media_before.secure_url} alt="Before" className="rounded-md object-cover" />
            <img src={result.media_after.secure_url} alt="After" className="rounded-md object-cover" />
          </div>
          <p className="mt-4 font-serif text-lg text-ink">{result.narrative}</p>
          {result.changes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {result.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── History ── */}
      {history && history.length > 0 && (
        <div>
          <h2 className="mb-3 font-serif text-lg text-ink">Past comparisons</h2>
          <div className="space-y-2">
            {history.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-ink">{c.narrative}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  <Link to={`/media/${c.media_before.id}`} className="hover:text-clay">
                    {c.media_before.original_filename ?? 'before'}
                  </Link>{' '}
                  →{' '}
                  <Link to={`/media/${c.media_after.id}`} className="hover:text-clay">
                    {c.media_after.original_filename ?? 'after'}
                  </Link>{' '}
                  · {formatDate(c.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepBadge({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
          done ? 'bg-green-600 text-white' : active ? 'bg-clay text-white' : 'bg-border text-ink-muted'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className={`text-sm ${active ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{label}</span>
    </div>
  );
}

function SlotThumb({ label, media, onClick }: { label: string; media: Media | null; onClick: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      {media ? (
        <button onClick={onClick} title="Click to change" className="group relative">
          <img
            src={media.thumbnail_url ?? media.secure_url}
            alt={label}
            className="h-10 w-10 rounded-md object-cover ring-2 ring-clay"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-xs text-white opacity-0 transition group-hover:opacity-100">
            ✕
          </span>
        </button>
      ) : (
        <div className="h-10 w-10 rounded-md border-2 border-dashed border-border" />
      )}
    </div>
  );
}
