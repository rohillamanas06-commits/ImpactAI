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
}: {
  media: Media;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (media: Media) => void;
}) {
  const content = (
    <>
      <MediaThumb media={media} className="h-40 w-full rounded-t-lg" />
      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm text-ink">
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
        <p className="text-xs text-ink-muted">{formatDate(media.media_date ?? media.created_at)}</p>
      </div>
    </>
  );

  const baseClasses = 'block overflow-hidden rounded-lg border bg-surface transition-shadow hover:shadow-md';

  if (selectable) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(media)}
        className={`${baseClasses} text-left ${selected ? 'border-clay ring-2 ring-clay/30' : 'border-border'}`}
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
