import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectContext } from '../hooks/useProjectContext';
import { useAsync } from '../hooks/useAsync';
import { reportsApi } from '../api/reports';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { formatDateTime } from '../utils/format';

export function ProjectReportsPage() {
  const { project } = useProjectContext();
  const { data: reports, loading, error, refetch } = useAsync(() => reportsApi.list(project.id), [project.id]);
  const [showGenerate, setShowGenerate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="max-w-xl text-sm text-ink-muted">
          A report summarizes the evidence collected so far — counts, locations, activities, and an AI-written
          narrative, with every source photo traceable back to the original upload.
        </p>
        <Button onClick={() => setShowGenerate(true)}>Generate report</Button>
      </div>

      {loading && <Spinner label="Loading reports…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}
      {reports && reports.length === 0 && (
        <EmptyState
          title="No reports yet"
          description="Generate an impact report once you have evidence uploaded."
          action={<Button onClick={() => setShowGenerate(true)}>Generate report</Button>}
        />
      )}
      {reports && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link
              key={r.id}
              to={`/projects/${project.id}/reports/${r.id}`}
              className="block rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg text-ink">{r.title}</h3>
                <span className="text-xs text-ink-muted">{formatDateTime(r.created_at)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{r.narrative}</p>
            </Link>
          ))}
        </div>
      )}

      {showGenerate && (
        <GenerateReportModal
          projectId={project.id}
          onClose={() => setShowGenerate(false)}
          onGenerated={() => {
            setShowGenerate(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function GenerateReportModal({
  projectId,
  onClose,
  onGenerated,
}: {
  projectId: string;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await reportsApi.generate(projectId, {
        title: title.trim() || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
      });
      onGenerated();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not generate the report. Make sure this project has evidence uploaded.',
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Generate impact report" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Q1 2026 progress report"
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-clay"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Period start (optional)</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Period end (optional)</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-ink-muted">Leave dates blank to include all evidence in this project.</p>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
