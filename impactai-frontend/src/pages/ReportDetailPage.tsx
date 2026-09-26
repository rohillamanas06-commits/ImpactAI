import { Link, useParams } from 'react-router-dom';
import { reportsApi } from '../api/reports';
import { useAsync } from '../hooks/useAsync';
import { useProjectContext } from '../hooks/useProjectContext';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatDate, formatDateTime } from '../utils/format';

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { project } = useProjectContext();
  const { data: report, loading, error } = useAsync(() => reportsApi.get(reportId!), [reportId]);

  if (loading) return <Spinner label="Loading report…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!report) return null;

  const { stats } = report;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link to={`/projects/${project.id}/reports`} className="text-xs text-ink-muted hover:text-clay">
          ← All reports
        </Link>
        <h1 className="mt-1 font-serif text-2xl text-ink">{report.title}</h1>
        <p className="mt-1 text-xs text-ink-muted">
          Generated {formatDateTime(report.created_at)}
          {report.period_start && report.period_end
            ? ` · covering ${formatDate(report.period_start)} – ${formatDate(report.period_end)}`
            : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.total_media !== undefined && <StatCard label="Total media" value={stats.total_media} />}
        {stats.images !== undefined && <StatCard label="Images" value={stats.images} />}
        {stats.videos !== undefined && <StatCard label="Videos" value={stats.videos} />}
        {stats.locations && <StatCard label="Locations" value={stats.locations.length} />}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="font-serif text-lg leading-relaxed text-ink">{report.narrative}</p>
      </div>

      {report.highlights.length > 0 && (
        <div>
          <h2 className="mb-2 font-serif text-lg text-ink">Highlights</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {report.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {stats.top_tags && stats.top_tags.length > 0 && (
        <div>
          <h2 className="mb-2 font-serif text-lg text-ink">Most common tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {stats.top_tags.map((t) => (
              <Badge key={t} tone="moss">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-serif text-lg text-ink">Source evidence ({report.source_media_ids.length})</h2>
        <p className="mb-2 text-xs text-ink-muted">
          Every number and claim above is drawn only from this evidence — nothing here was invented.
        </p>
        <div className="flex flex-wrap gap-2">
          {report.source_media_ids.map((id) => (
            <Link
              key={id}
              to={`/media/${id}`}
              className="rounded border border-border-strong px-2 py-1 text-xs text-ink-muted hover:border-clay hover:text-clay"
            >
              {id.slice(0, 8)}…
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
