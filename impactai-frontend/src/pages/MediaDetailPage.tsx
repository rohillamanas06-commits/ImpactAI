import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mediaApi } from '../api/media';
import { useAsync } from '../hooks/useAsync';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatBytes, formatDate, formatDuration } from '../utils/format';

export function MediaDetailPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const { data: media, loading, error } = useAsync(() => mediaApi.get(mediaId!), [mediaId]);
  const [deleting, setDeleting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function handleDelete() {
    if (!media || !window.confirm('Delete this evidence item? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await mediaApi.remove(media.id);
      navigate(`/projects/${media.project_id}/media`);
    } catch {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="px-8 py-10">
        <Spinner label="Loading evidence…" />
      </div>
    );
  }
  if (error || !media) {
    return (
      <div className="px-8 py-10">
        <ErrorBanner message={error ?? 'Media not found.'} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link to={`/projects/${media.project_id}/media`} className="text-xs text-ink-muted hover:text-clay">
        ← Back to media
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          {media.cloudinary_resource_type === 'video' ? (
            <video src={media.secure_url} controls poster={media.thumbnail_url ?? undefined} className="w-full rounded-lg" />
          ) : (
            <img src={media.secure_url} alt={media.description ?? ''} className="w-full rounded-lg object-cover" />
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="font-serif text-xl text-ink">{media.description ?? 'No AI description available'}</h1>
            <p className="mt-1 text-xs text-ink-muted">
              {media.original_filename} · {formatDate(media.media_date ?? media.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {media.location && <Badge tone="slate">{media.location}</Badge>}
            {media.activity && <Badge tone="clay">{media.activity}</Badge>}
            {media.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
            {media.signals.map((s) => (
              <Badge key={s} tone="moss">
                {s}
              </Badge>
            ))}
          </div>

          {(media.ai_location_guess || media.ai_activity_guess) && (
            <p className="text-xs text-ink-muted">
              AI guessed: {media.ai_location_guess ?? '—'} / {media.ai_activity_guess ?? '—'}
              {media.location || media.activity ? ' (overridden above by what was entered at upload)' : ''}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <DetailRow label="Type" value={media.cloudinary_resource_type} />
            <DetailRow label="Format" value={media.format ?? '—'} />
            <DetailRow label="Size" value={formatBytes(media.size_bytes)} />
            <DetailRow
              label="Dimensions"
              value={media.width && media.height ? `${media.width} × ${media.height}` : '—'}
            />
            {media.cloudinary_resource_type === 'video' && (
              <DetailRow label="Duration" value={formatDuration(media.duration)} />
            )}
          </dl>

          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete evidence'}
          </Button>
        </div>
      </div>

      <section className="mt-10 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-serif text-lg text-ink">Evidence traceability</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Every AI-generated field on this page traces back to this exact source asset and, for video, the specific
          frame that was analyzed.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <DetailRow label="Cloudinary public ID" value={media.cloudinary_public_id} mono />
          <DetailRow
            label="Source asset"
            value={
              <a href={media.secure_url} target="_blank" rel="noreferrer" className="text-clay hover:underline">
                Open original
              </a>
            }
          />
          {media.thumbnail_url && media.cloudinary_resource_type === 'video' && (
            <DetailRow
              label="Analyzed frame"
              value={
                <a href={media.thumbnail_url} target="_blank" rel="noreferrer" className="text-clay hover:underline">
                  Open extracted frame
                </a>
              }
            />
          )}
        </dl>

        {media.transformations && Object.keys(media.transformations).length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-ink-muted">Transformation used for analysis</p>
            <pre className="mt-1 overflow-x-auto rounded bg-black/5 p-3 text-xs text-ink">
              {JSON.stringify(media.transformations, null, 2)}
            </pre>
          </div>
        )}

        {media.ai_raw_response && (
          <div className="mt-4">
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="text-xs font-medium text-clay hover:underline"
            >
              {showRaw ? 'Hide' : 'Show'} raw AI response
            </button>
            {showRaw && (
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-black/5 p-3 text-xs text-ink">
                {JSON.stringify(media.ai_raw_response, null, 2)}
              </pre>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`text-ink ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
