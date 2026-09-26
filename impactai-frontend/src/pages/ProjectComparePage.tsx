import { useEffect, useRef, useState } from 'react';
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
import React from 'react';

export function ProjectComparePage() {
  const { project } = useProjectContext();
  const { data: media, loading, error } = useAsync(() => mediaApi.list(project.id), [project.id]);
  const {
    data: history,
    loading: historyLoading,
    refetch: refetchHistory,
  } = useAsync(() => compareApi.list(project.id), [project.id]);

  const [before, setBefore] = useState<Media | null>(null);
  const [after, setAfter] = useState<Media | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [latestId, setLatestId] = useState<string | null>(null);

  const latestRef = useRef<HTMLDivElement | null>(null);

  // scroll newest result into view after a new compare
  useEffect(() => {
    if (latestId && latestRef.current) {
      latestRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [latestId, history]);

  // step 1 = picking before, step 2 = picking after
  const step = before === null ? 1 : 2;

  function reset() {
    setBefore(null);
    setAfter(null);
    setCompareError(null);
  }

  async function runCompare() {
    if (!before || !after) return;
    setComparing(true);
    setCompareError(null);
    try {
      const res = await compareApi.compare(before.id, after.id);
      setLatestId(res.id);
      await refetchHistory();
      reset();
    } catch (err) {
      setCompareError(
        err instanceof ApiError
          ? err.message
          : 'Comparison failed — the AI service may be temporarily unavailable. Please try again.',
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

      {/* ── History — always shown, persists across tab switches & restarts ── */}
      <div>
        <h2 className="mb-4 font-serif text-lg text-ink">
          {historyLoading ? 'Loading comparisons…' : history && history.length > 0 ? 'Comparisons' : 'No comparisons yet'}
        </h2>

        {historyLoading && <Spinner label="Loading history…" />}

        {!historyLoading && history && history.length === 0 && (
          <p className="text-sm text-ink-muted">
            Run your first comparison above — results will appear here permanently.
          </p>
        )}

        {history && history.length > 0 && (
          <div className="space-y-4">
            {history.map((c) => (
              <ComparisonCard
                key={c.id}
                comparison={c}
                isLatest={c.id === latestId}
                ref={c.id === latestId ? latestRef : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Comparison card with images ── */

interface ComparisonCardProps {
  comparison: CompareResponse;
  isLatest: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

const ComparisonCard = React.forwardRef<HTMLDivElement, Omit<ComparisonCardProps, 'ref'>>(
  ({ comparison: c, isLatest }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl border bg-surface p-5 transition-all ${
        isLatest ? 'border-clay shadow-md' : 'border-border'
      }`}
    >
      {isLatest && (
        <span className="mb-3 inline-block rounded-full bg-clay px-2 py-0.5 text-xs font-semibold text-white">
          Latest
        </span>
      )}

      {/* Before / After images */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Before</p>
          <img
            src={c.media_before.thumbnail_url ?? c.media_before.secure_url}
            alt="Before"
            className="h-36 w-full rounded-lg object-cover"
          />
          <Link
            to={`/media/${c.media_before.id}`}
            className="mt-1 block truncate text-xs text-ink-muted hover:text-clay"
          >
            {c.media_before.original_filename ?? 'before'}
          </Link>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">After</p>
          <img
            src={c.media_after.thumbnail_url ?? c.media_after.secure_url}
            alt="After"
            className="h-36 w-full rounded-lg object-cover"
          />
          <Link
            to={`/media/${c.media_after.id}`}
            className="mt-1 block truncate text-xs text-ink-muted hover:text-clay"
          >
            {c.media_after.original_filename ?? 'after'}
          </Link>
        </div>
      </div>

      {/* Narrative */}
      <p className="mt-4 text-sm text-ink">{c.narrative}</p>

      {/* Changes */}
      {c.changes.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
          {c.changes.map((ch, i) => (
            <li key={i}>{ch}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-ink-muted">{formatDate(c.created_at)}</p>
    </div>
  ),
);
ComparisonCard.displayName = 'ComparisonCard';

/* ── Step badge ── */
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

/* ── Slot thumbnail ── */
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
