import { useState } from 'react';
import { useProjectContext } from '../hooks/useProjectContext';
import { useAsync } from '../hooks/useAsync';
import { mediaApi, type MediaFilters } from '../api/media';
import type { Media } from '../api/types';
import { MediaCard } from '../components/MediaCard';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { UploadDropzone } from '../components/UploadDropzone';

export function ProjectMediaPage() {
  const { project, refetchProject } = useProjectContext();
  const [filters, setFilters] = useState<MediaFilters>({});
  const [pendingFilters, setPendingFilters] = useState<MediaFilters>({});
  const [showUpload, setShowUpload] = useState(false);

  const { data: media, loading, error, refetch } = useAsync(
    () => mediaApi.list(project.id, filters),
    [project.id, filters],
  );

  async function handleDeleteMedia(m: Media) {
    if (!window.confirm(`Delete evidence "${m.description || m.original_filename || 'item'}"?`)) return;
    try {
      await mediaApi.remove(m.id);
      refetch();
      refetchProject();
    } catch {
      alert('Could not delete evidence.');
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Location">
            <input
              value={pendingFilters.location ?? ''}
              onChange={(e) => setPendingFilters((f) => ({ ...f, location: e.target.value }))}
              placeholder="Any location"
              className="w-40 rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
          </FilterField>
          <FilterField label="Activity">
            <input
              value={pendingFilters.activity ?? ''}
              onChange={(e) => setPendingFilters((f) => ({ ...f, activity: e.target.value }))}
              placeholder="Any activity"
              className="w-40 rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
          </FilterField>
          <FilterField label="Type">
            <select
              value={pendingFilters.resource_type ?? ''}
              onChange={(e) =>
                setPendingFilters((f) => ({ ...f, resource_type: (e.target.value || undefined) as 'image' | 'video' | undefined }))
              }
              className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </FilterField>
          <FilterField label="From">
            <input
              type="date"
              value={pendingFilters.date_from ?? ''}
              onChange={(e) => setPendingFilters((f) => ({ ...f, date_from: e.target.value }))}
              className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
          </FilterField>
          <FilterField label="To">
            <input
              type="date"
              value={pendingFilters.date_to ?? ''}
              onChange={(e) => setPendingFilters((f) => ({ ...f, date_to: e.target.value }))}
              className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
          </FilterField>
          <Button variant="secondary" onClick={() => setFilters(pendingFilters)}>
            Apply
          </Button>
        </div>
        <Button onClick={() => setShowUpload(true)}>Upload evidence</Button>
      </div>

      {loading && <Spinner label="Loading evidence…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}
      {media && media.length === 0 && (
        <EmptyState
          title="No evidence matches these filters"
          description="Try clearing filters, or upload new field photos and video."
          action={<Button onClick={() => setShowUpload(true)}>Upload evidence</Button>}
        />
      )}
      {media && media.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <MediaCard key={m.id} media={m} onDelete={handleDeleteMedia} />
          ))}
        </div>

      )}

      {showUpload && (
        <UploadModal
          projectId={project.id}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            refetch();
            refetchProject();
          }}
        />
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function UploadModal({
  projectId,
  onClose,
  onUploaded,
}: {
  projectId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState('');
  const [activity, setActivity] = useState('');
  const [mediaDate, setMediaDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError('Add at least one photo or video.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await mediaApi.upload(projectId, files, {
        location: location.trim() || undefined,
        activity: activity.trim() || undefined,
        media_date: mediaDate || undefined,
      });
      onUploaded();
    } catch {
      setError(
        'Upload failed. Each file is analyzed by Cloudinary and Gemini — check that both API keys are configured on the backend.',
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Upload evidence" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <UploadDropzone files={files} onFilesChange={setFiles} />
        <p className="text-xs text-ink-muted">
          Leave location or activity blank and the AI will guess from what it sees in the photo.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FilterField label="Location (optional)">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Yamuna riverbank"
              className="w-full rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
          </FilterField>
          <FilterField label="Activity (optional)">
            <input
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Cleanup drive"
              className="w-full rounded-md border border-border-strong px-2 py-1.5 text-sm"
            />
          </FilterField>
        </div>
        <FilterField label="Date (optional)">
          <input
            type="date"
            value={mediaDate}
            onChange={(e) => setMediaDate(e.target.value)}
            className="rounded-md border border-border-strong px-2 py-1.5 text-sm"
          />
        </FilterField>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Uploading & analyzing…' : `Upload ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
