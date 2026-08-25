import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import type { CivicIssue, IssueCategory } from '@/lib/types';
import { CATEGORY_META, STATUS_META } from '@/lib/types';

interface MapViewProps {
  issues: CivicIssue[];
  onSelect: (issue: CivicIssue) => void;
}

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  road: '#f59e0b',
  garbage: '#10b981',
  streetlight: '#eab308',
  water: '#3b82f6',
  drain: '#06b6d4',
  other: '#64748b',
};

function createIcon(category: IssueCategory, severity: number): L.DivIcon {
  const color = CATEGORY_COLORS[category];
  const size = 22 + severity * 5;
  return L.divIcon({
    className: 'civic-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: bold;
    ">${severity}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ issues }: { issues: CivicIssue[] }) {
  const map = useMap();
  useEffect(() => {
    const geoIssues = issues.filter((i) => i.latitude && i.longitude);
    if (geoIssues.length === 0) return;
    if (geoIssues.length === 1) {
      map.setView([geoIssues[0].latitude!, geoIssues[0].longitude!], 14);
      return;
    }
    const bounds = L.latLngBounds(
      geoIssues.map((i) => [i.latitude!, i.longitude!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [issues, map]);
  return null;
}

export default function MapView({ issues, onSelect }: MapViewProps) {
  const geoIssues = issues.filter((i) => i.latitude && i.longitude);
  const containerRef = useRef<HTMLDivElement>(null);

  if (geoIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <MapPin size={40} />
        <p className="text-sm">No geolocated issues yet. Reports with location data will appear on the map.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-slate-200" style={{ height: '550px' }}>
        <MapContainer
          center={[geoIssues[0].latitude!, geoIssues[0].longitude!]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geoIssues.map((issue) => (
            <Marker
              key={issue.id}
              position={[issue.latitude!, issue.longitude!]}
              icon={createIcon(issue.category, issue.severity)}
            >
              <Popup>
                <div className="space-y-1.5 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ background: CATEGORY_COLORS[issue.category] }}
                    >
                      {CATEGORY_META[issue.category].label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_META[issue.status].color}`}>
                      {STATUS_META[issue.status].label}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-800">{issue.title || 'Untitled Issue'}</p>
                  {issue.photo_url && (
                    <img src={issue.photo_url} alt={issue.title || 'Issue'} className="w-full h-24 object-cover rounded-md" />
                  )}
                  <p className="text-xs text-slate-600 line-clamp-2">{issue.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Severity: <strong>{issue.severity}/5</strong></span>
                    {issue.address && <span>| {issue.address}</span>}
                  </div>
                  <button
                    onClick={() => onSelect(issue)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
          <FitBounds issues={issues} />
        </MapContainer>

        {/* Count badge */}
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-2 text-xs text-slate-500 shadow-sm">
          <Navigation size={12} /> {geoIssues.length} geolocated issues
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">Legend:</p>
        {(Object.entries(CATEGORY_COLORS) as [IssueCategory, string][]).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ background: color }} />
            {CATEGORY_META[key].label}
          </div>
        ))}
        <p className="text-xs text-slate-400 ml-auto">Pin size = severity level</p>
      </div>
    </div>
  );
}
