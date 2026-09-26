import { useState } from 'react';
import type { Media } from '../api/types';

export function MediaThumb({ media, className = '' }: { media: Media; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = media.thumbnail_url || media.secure_url;

  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-moss-soft text-moss ${className}`}>
        <span className="text-xs">No preview</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black/5 ${className}`}>
      <img
        src={src}
        alt={media.description ?? media.original_filename ?? 'Evidence media'}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
        loading="lazy"
      />
      {media.cloudinary_resource_type === 'video' && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-shell/80 px-1.5 py-0.5 text-[10px] font-medium text-shell-ink">
          ▶ video
        </span>
      )}
    </div>
  );
}
