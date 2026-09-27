import { useEffect, useRef, useState } from 'react';
import { useProjectContext } from '../hooks/useProjectContext';
import { mediaApi } from '../api/media';
import type { Media } from '../api/types';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Link } from 'react-router-dom';
import L from 'leaflet';

export function ProjectMapPage() {
  const { project } = useProjectContext();
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    async function loadGeoMedia() {
      setLoading(true);
      setError(null);
      try {
        const data = await mediaApi.getGeo(project.id);
        setMediaItems(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load mapped evidence.');
      } finally {
        setLoading(false);
      }
    }
    loadGeoMedia();
  }, [project.id]);

  const validItems = mediaItems.filter(
    (m) => typeof m.latitude === 'number' && typeof m.longitude === 'number'
  );

  const uniqueLocations = Array.from(
    new Set(validItems.map((m) => m.location || m.ai_location_guess).filter(Boolean))
  );

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([20.5937, 78.9629], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (validItems.length > 0) {
      const bounds = L.latLngBounds([]);

      validItems.forEach((item) => {
        const lat = item.latitude!;
        const lon = item.longitude!;
        bounds.extend([lat, lon]);

        const isVideo = item.cloudinary_resource_type === 'video';
        const pinBg = isVideo ? '#b5622a' : '#4b6b4e';

        const iconHtml = `
          <div style="
            background-color: ${pinBg};
            width: 26px;
            height: 26px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.25);
            cursor: pointer;
          ">
            <span style="transform: rotate(45deg); color: #ffffff; font-size: 11px; font-weight: bold;">
              ${isVideo ? '▶' : '•'}
            </span>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'impact-map-marker',
          iconSize: [26, 26],
          iconAnchor: [13, 26],
          popupAnchor: [0, -26],
        });

        const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="width: 210px; font-family: 'IBM Plex Sans', sans-serif; color: #21261f;">
            <img src="${item.thumbnail_url || item.secure_url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 6px;" />
            <div style="font-family: 'Source Serif 4', Georgia, serif; font-weight: 600; font-size: 14px; margin-bottom: 2px;">
              ${item.location || item.ai_location_guess || 'Field Site'}
            </div>
            <div style="font-size: 11px; color: #6b6558; margin-bottom: 4px;">
              ${item.media_date || 'Undated'} · ${lat.toFixed(4)}, ${lon.toFixed(4)}
            </div>
            <p style="font-size: 11px; color: #21261f; line-height: 1.3; margin: 0 0 8px 0; max-height: 38px; overflow: hidden;">
              ${item.description || ''}
            </p>
            <a href="/media/${item.id}" style="
              display: block;
              text-align: center;
              background-color: #b5622a;
              color: #ffffff;
              text-decoration: none;
              font-size: 11px;
              font-weight: 500;
              padding: 4px 8px;
              border-radius: 4px;
            ">
              View evidence →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => setSelectedMedia(item));
        markersRef.current.push(marker);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [validItems]);

  const filteredMedia = validItems.filter((m) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (m.location && m.location.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ink">Geospatial Evidence Map</h1>
          <p className="mt-1 text-sm text-ink-muted">
            All photos and videos pinned by EXIF GPS coordinates and verified locations.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <Badge tone="moss">Photos</Badge>
          <Badge tone="clay">Videos</Badge>
          <Badge tone="neutral">EXIF Extracted</Badge>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total mapped" value={validItems.length} />
        <StatCard label="Field sites" value={uniqueLocations.length} />
        <StatCard
          label="Photos"
          value={validItems.filter((m) => m.cloudinary_resource_type === 'image').length}
        />
        <StatCard
          label="Videos"
          value={validItems.filter((m) => m.cloudinary_resource_type === 'video').length}
        />
      </div>

      {loading && <Spinner label="Loading geospatial evidence…" />}
      {error && <ErrorBanner message={error} />}

      {!loading && validItems.length === 0 && (
        <EmptyState
          title="No mapped evidence yet"
          description="Uploaded photos with camera GPS metadata or recognizable place names will appear here automatically."
        />
      )}

      {/* Map + Sidebar Layout */}
      {validItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[580px] rounded-lg border border-border bg-surface overflow-hidden">
          {/* Map canvas */}
          <div className="lg:col-span-3 h-full relative">
            <div ref={mapContainerRef} className="h-full w-full z-10" />
          </div>

          {/* Side panel */}
          <div className="flex flex-col h-full border-t lg:border-t-0 lg:border-l border-border bg-paper p-4 overflow-hidden">
            <div className="mb-3">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                Monitored Sites ({filteredMedia.length})
              </label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter locations…"
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredMedia.map((m) => {
                const isSelected = selectedMedia?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMedia(m);
                      if (mapInstanceRef.current && m.latitude && m.longitude) {
                        mapInstanceRef.current.flyTo([m.latitude, m.longitude], 13, { duration: 1.2 });
                      }
                    }}
                    className={`cursor-pointer rounded-lg border p-2.5 transition-colors text-xs ${
                      isSelected
                        ? 'border-clay bg-clay-soft'
                        : 'border-border bg-surface hover:border-border-strong'
                    }`}
                  >
                    <div className="flex gap-2">
                      <img
                        src={m.thumbnail_url || m.secure_url}
                        alt="Evidence"
                        className="h-12 w-12 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink truncate">
                          {m.location || m.ai_location_guess || 'Field Site'}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-ink-muted mt-0.5">
                          {m.description || 'Verified evidence asset'}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-ink-muted">
                          <span>{m.media_date || 'Undated'}</span>
                          <span className="font-mono text-moss">
                            {m.latitude?.toFixed(2)}°, {m.longitude?.toFixed(2)}°
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-between">
                      <div className="flex gap-1 overflow-hidden">
                        {(m.tags || []).slice(0, 2).map((t, idx) => (
                          <span key={idx} className="rounded bg-black/5 px-1 py-0.2 text-[9px] text-ink-muted">
                            #{t}
                          </span>
                        ))}
                      </div>
                      <Link
                        to={`/media/${m.id}`}
                        className="text-[11px] text-clay hover:underline font-medium"
                      >
                        Inspect →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
