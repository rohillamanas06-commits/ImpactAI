import { Link } from 'react-router-dom';
import type { Media } from '../api/types';
import { Badge } from './Badge';
import { MediaThumb } from './MediaThumb';
import { formatDate, truncate } from '../utils/format';

export function MediaCard({
  media,
  selectable = false,
  selected = false,
  onSelect,
  onDelete,
}: {
  media: Media;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (media: Media) => void;
  onDelete?: (media: Media) => void;
}) {
  const content = (
    <>
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-black/5">
        <MediaThumb media={media} className="h-full w-full" />
        {onDelete && !selectable && (
          <button
            type="button"
            title="Delete evidence"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(media);
            }}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-shell/80 text-shell-ink opacity-0 transition-opacity hover:bg-danger hover:text-white group-hover:opacity-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between space-y-2 p-3 w-full">
        <div className="space-y-2">
          <p className="line-clamp-2 text-sm font-medium text-ink">
            {media.description ?? media.original_filename ?? 'No description yet'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {media.location && <Badge tone="slate">{truncate(media.location, 24)}</Badge>}
            {media.activity && <Badge tone="clay">{truncate(media.activity, 24)}</Badge>}
            {media.signals.slice(0, 2).map((s) => (
              <Badge key={s} tone="moss">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink-muted">{formatDate(media.media_date ?? media.created_at)}</p>
      </div>
    </>
  );

  const baseClasses =
    'group flex flex-col h-full w-full overflow-hidden rounded-lg border bg-surface text-left transition-all duration-150 hover:shadow-md';

  if (selectable) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(media)}
        className={`${baseClasses} ${selected ? 'border-clay ring-2 ring-clay/40 shadow-sm' : 'border-border'}`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={`/media/${media.id}`} className={`${baseClasses} border-border`}>
      {content}
    </Link>
  );
}
