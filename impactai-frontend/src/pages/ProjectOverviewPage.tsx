import { Link } from 'react-router-dom';
import { useProjectContext } from '../hooks/useProjectContext';
import { useAsync } from '../hooks/useAsync';
import { mediaApi } from '../api/media';
import { StatCard } from '../components/StatCard';
import { MediaCard } from '../components/MediaCard';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/format';

export function ProjectOverviewPage() {
  const { project } = useProjectContext();
  const { stats } = project;
  const {
    data: recentMedia,
    loading,
    error,
    refetch,
  } = useAsync(() => mediaApi.list(project.id), [project.id]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total media" value={stats.total_media} />
        <StatCard label="Images" value={stats.images} />
        <StatCard label="Videos" value={stats.videos} />
        <StatCard label="Locations" value={stats.locations.length} />
        <StatCard label="Activities" value={stats.activities.length} />
        <StatCard
          label="Date range"
          value={stats.date_range ? `${formatDate(stats.date_range.start)} – ${formatDate(stats.date_range.end)}` : '—'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to={`/projects/${project.id}/media`}>
          <Button>Upload evidence</Button>
        </Link>
        <Link to={`/projects/${project.id}/search`}>
          <Button variant="secondary">Search evidence</Button>
        </Link>
        <Link to={`/projects/${project.id}/compare`}>
          <Button variant="secondary">Compare before/after</Button>
        </Link>
        <Link to={`/projects/${project.id}/reports`}>
          <Button variant="secondary">Generate impact report</Button>
        </Link>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">Recent evidence</h2>
          {recentMedia && recentMedia.length > 0 && (
            <Link to={`/projects/${project.id}/media`} className="text-sm text-clay hover:underline">
              View all
            </Link>
          )}
        </div>
        {loading && <Spinner label="Loading evidence…" />}
        {error && <ErrorBanner message={error} onRetry={refetch} />}
        {recentMedia && recentMedia.length === 0 && (
          <EmptyState
            title="No evidence uploaded yet"
            description="Upload field photos or video to let AI tag, describe, and organize them."
            action={
              <Link to={`/projects/${project.id}/media`}>
                <Button>Upload evidence</Button>
              </Link>
            }
          />
        )}
        {recentMedia && recentMedia.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {recentMedia.slice(0, 10).map((m) => (
              <MediaCard key={m.id} media={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
