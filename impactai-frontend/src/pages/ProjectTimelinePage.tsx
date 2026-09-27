import { useEffect, useState } from 'react';
import { useProjectContext } from '../hooks/useProjectContext';
import { mediaApi } from '../api/media';
import type { TimelineResponse, BeforeAfterPair } from '../api/types';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Link, useNavigate } from 'react-router-dom';

export function ProjectTimelinePage() {
  const { project } = useProjectContext();
  const navigate = useNavigate();

  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      setError(null);
      try {
        const res = await mediaApi.getTimeline(project.id);
        setTimeline(res);
      } catch (err: any) {
        setError(err?.message || 'Failed to load project timeline.');
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [project.id]);

  if (loading) return <Spinner label="Loading chronological timeline…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!timeline || timeline.total_items === 0) {
    return (
      <EmptyState
        title="No timeline evidence recorded"
        description="Upload photos and videos with dates to build an authenticated chronological record."
        action={
          <Button onClick={() => navigate(`/projects/${project.id}/media`)}>
            Upload evidence
          </Button>
        }
      />
    );
  }

  const maxBucketCount = Math.max(...(timeline.buckets.map((b) => b.count) || [1]), 1);

  const displayBuckets = timeline.buckets.filter((b) => {
    if (selectedPeriod && b.period !== selectedPeriod) return false;
    if (dateFrom && b.period < dateFrom.slice(0, 7)) return false;
    if (dateTo && b.period > dateTo.slice(0, 7)) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ink">Project Timeline</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Chronological documentation covering {timeline.date_min || 'inception'} to {timeline.date_max || 'present'}.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setSelectedPeriod(null);
            }}
            className="rounded-md border border-border-strong px-2.5 py-1.5 bg-surface text-ink text-xs focus:border-clay focus:outline-none"
            placeholder="From"
          />
          <span className="text-ink-muted">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setSelectedPeriod(null);
            }}
            className="rounded-md border border-border-strong px-2.5 py-1.5 bg-surface text-ink text-xs focus:border-clay focus:outline-none"
            placeholder="To"
          />
          {(dateFrom || dateTo || selectedPeriod) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSelectedPeriod(null);
              }}
              className="text-xs text-clay hover:underline px-2 cursor-pointer font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total assets" value={timeline.total_items} />
        <StatCard label="Time periods" value={timeline.buckets.length} />
        <StatCard label="Auto-paired comparisons" value={timeline.auto_detected_pairs.length} />
        <StatCard
          label="Active range"
          value={timeline.date_min ? `${timeline.date_min.slice(0, 7)} …` : 'N/A'}
        />
      </div>

      {/* 1. Upload Density Histogram Bar Chart */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Upload Density Over Time
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Click any month to inspect assets from that period</p>
          </div>
          {selectedPeriod && (
            <Badge tone="clay">Filtered: {selectedPeriod}</Badge>
          )}
        </div>

        <div className="flex items-end gap-3 h-32 pt-4 border-b border-border overflow-x-auto pb-2">
          {timeline.buckets.map((b) => {
            const heightPercent = Math.max(Math.round((b.count / maxBucketCount) * 100), 12);
            const isSelected = selectedPeriod === b.period;

            return (
              <div
                key={b.period}
                onClick={() => setSelectedPeriod(isSelected ? null : b.period)}
                className="flex flex-col items-center flex-1 min-w-[52px] max-w-[80px] group cursor-pointer"
              >
                <div className="relative w-full flex items-end justify-center h-24">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t transition-colors ${
                      isSelected
                        ? 'bg-clay'
                        : 'bg-moss hover:bg-moss/80'
                    }`}
                  />
                </div>
                <span className="mt-2 text-[10px] font-medium text-ink-muted group-hover:text-ink">
                  {b.period}
                </span>
                <span className="text-[9px] text-ink-muted">({b.count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Auto-Detected Before & After Pairs Section */}
      {timeline.auto_detected_pairs.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-ink">Auto-Detected Before &amp; After Candidates</h2>
              <p className="text-xs text-ink-muted">
                Photos taken at identical field sites or sharing environmental signals across time.
              </p>
            </div>
            <Badge tone="moss">{timeline.auto_detected_pairs.length} Candidates</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timeline.auto_detected_pairs.map((pair: BeforeAfterPair, idx: number) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-paper p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-ink truncate max-w-[200px]">
                      {pair.location || 'Field Site'}
                    </span>
                    <Badge tone="slate">{pair.time_gap_days} days apart</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <div className="relative">
                        <img
                          src={pair.before_media.thumbnail_url || pair.before_media.secure_url}
                          alt="Before"
                          className="h-24 w-full rounded object-cover"
                        />
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                          Before
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-ink-muted">
                        {pair.before_media.media_date || 'Earlier'}
                      </p>
                    </div>

                    <div>
                      <div className="relative">
                        <img
                          src={pair.after_media.thumbnail_url || pair.after_media.secure_url}
                          alt="After"
                          className="h-24 w-full rounded object-cover"
                        />
                        <span className="absolute bottom-1 left-1 rounded bg-moss px-1.5 py-0.5 text-[9px] text-white">
                          After
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-ink-muted">
                        {pair.after_media.media_date || 'Later'}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-ink-muted line-clamp-1">
                    {pair.similarity_reason}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border flex items-center justify-end">
                  <Link
                    to={`/projects/${project.id}/compare?before=${pair.before_media.id}&after=${pair.after_media.id}`}
                    className="text-xs font-medium text-clay hover:underline"
                  >
                    Compare in Workspace →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Chronological Vertical Feed */}
      <div className="space-y-6">
        <h2 className="font-serif text-lg text-ink">Chronological Archive</h2>

        {displayBuckets.map((bucket) => (
          <div key={bucket.period} className="relative pl-6 border-l-2 border-border space-y-3">
            <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-clay" />

            <div className="flex items-center gap-2">
              <span className="font-serif text-base text-ink">{bucket.period}</span>
              <span className="text-xs text-ink-muted">({bucket.count} items)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {bucket.media_items.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/media/${m.id}`)}
                  className="group cursor-pointer rounded-lg border border-border bg-surface p-2 hover:border-clay transition-colors"
                >
                  <img
                    src={m.thumbnail_url || m.secure_url}
                    alt="Evidence"
                    className="h-28 w-full rounded object-cover"
                  />
                  <div className="mt-2 truncate">
                    <p className="text-xs font-medium text-ink truncate">
                      {m.location || m.ai_location_guess || 'Field Site'}
                    </p>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      {m.media_date || m.created_at.slice(0, 10)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                      {m.description || 'Verified evidence asset'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
