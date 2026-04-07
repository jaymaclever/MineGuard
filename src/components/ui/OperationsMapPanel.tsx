import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, MapPin } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../../lib/utils';
import { formatDate, LUANDA_TIMEZONE_LABEL } from '../../lib/datetime';

// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type MapReport = {
  id: number;
  agente_nome: string;
  categoria: string;
  gravidade: 'G1' | 'G2' | 'G3' | 'G4';
  descricao: string;
  timestamp: string;
  coords_lat: number;
  coords_lng: number;
};

interface OperationsMapPanelProps {
  reports: MapReport[];
  initialCenter: [number, number];
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onOpenReportDetails: (report: MapReport) => void;
}

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const getHeatIcon = (severity: MapReport['gravidade']) => {
  const size = severity === 'G4' ? 80 : severity === 'G3' ? 60 : severity === 'G2' ? 40 : 30;
  const color = severity === 'G4' ? '#ef4444' : severity === 'G3' ? '#f97316' : severity === 'G2' ? '#eab308' : '#3b82f6';
  const opacity = severity === 'G4' ? 0.3 : severity === 'G3' ? 0.2 : severity === 'G2' ? 0.15 : 0.1;

  return L.divIcon({
    className: 'custom-heat-pin',
    html: `<div style="
      background:${color};
      width:${size}px;
      height:${size}px;
      margin-left:-${size / 2}px;
      margin-top:-${size / 2}px;
      border-radius:50%;
      opacity:${opacity};
      filter:blur(${size / 4}px);
      box-shadow:0 0 ${size / 2}px ${color};
      animation:pulse-heat 3s infinite ease-in-out;
    "></div>`,
  });
};

const MapCenterController = ({ target, zoom }: { target: [number, number] | null; zoom: number }) => {
  const map = useMap();
  const appliedTarget = useRef<string>('');

  useEffect(() => {
    if (!target) return;
    const targetKey = `${target[0].toFixed(4)}:${target[1].toFixed(4)}`;
    if (appliedTarget.current === targetKey) return;
    appliedTarget.current = targetKey;
    window.requestAnimationFrame(() => {
      map.setView(target, zoom, { animate: false });
    });
  }, [map, target, zoom]);

  return null;
};

const MapViewportTracker = ({ onCenterChange }: { onCenterChange: (center: [number, number]) => void }) => {
  useMapEvents({
    moveend(event) {
      const center = event.target.getCenter();
      onCenterChange([center.lat, center.lng]);
    },
  });

  return null;
};

export const OperationsMapPanel: React.FC<OperationsMapPanelProps> = ({
  reports,
  initialCenter,
  showHeatmap,
  onToggleHeatmap,
  onOpenReportDetails,
}) => {
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(initialCenter);

  useEffect(() => {
    setCurrentCenter(initialCenter);
  }, [initialCenter]);

  const mappedReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          Number.isFinite(Number(report.coords_lat)) &&
          Number.isFinite(Number(report.coords_lng)) &&
          Number(report.coords_lat) !== 0 &&
          Number(report.coords_lng) !== 0,
      ),
    [reports],
  );

  const hotspotCenter = useMemo<[number, number] | null>(() => {
    if (!mappedReports.length) return null;

    const buckets = new Map<string, { count: number; latSum: number; lngSum: number }>();

    mappedReports.forEach((report) => {
      const lat = Number(report.coords_lat);
      const lng = Number(report.coords_lng);
      const key = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
      const current = buckets.get(key) || { count: 0, latSum: 0, lngSum: 0 };
      current.count += 1;
      current.latSum += lat;
      current.lngSum += lng;
      buckets.set(key, current);
    });

    let bestBucket: { count: number; latSum: number; lngSum: number } | null = null;
    buckets.forEach((bucket) => {
      if (!bestBucket || bucket.count > bestBucket.count) {
        bestBucket = bucket;
      }
    });

    if (!bestBucket) return null;
    return [bestBucket.latSum / bestBucket.count, bestBucket.lngSum / bestBucket.count];
  }, [mappedReports]);

  return (
    <div className="relative z-0 h-[400px] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)]">
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: 'var(--bg-main)' }}
      >
        <MapCenterController target={hotspotCenter} zoom={13} />
        <MapViewportTracker onCenterChange={setCurrentCenter} />
        <TileLayer
          attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {showHeatmap &&
          mappedReports.map((report) => (
            <Marker
              key={`heat-${report.id}`}
              position={[Number(report.coords_lat), Number(report.coords_lng)]}
              icon={getHeatIcon(report.gravidade)}
            />
          ))}

        {mappedReports.map((report) => (
          <Marker key={report.id} position={[Number(report.coords_lat), Number(report.coords_lng)]}>
            <Popup className="custom-popup">
              <div className="min-w-[180px] p-2 text-[var(--text-main)]">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">{report.categoria}</p>
                <p className="mb-2 text-sm font-bold text-[var(--text-main)]">{report.agente_nome}</p>
                <p className="mb-3 line-clamp-3 text-[10px] leading-relaxed text-[var(--text-muted)] italic">"{report.descricao}"</p>
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                  <span className="text-[9px] font-bold text-[var(--text-faint)]">{formatDate(report.timestamp, 'pt')}</span>
                  <button
                    onClick={() => onOpenReportDetails(report)}
                    className="text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:text-[var(--text-main)]"
                  >
                    Ver ficha
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button
        onClick={onToggleHeatmap}
        className={cn(
          'absolute right-4 top-4 z-[1000] flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all',
          showHeatmap
            ? 'border-primary bg-primary text-primary-foreground shadow-primary/20'
            : 'border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]',
        )}
      >
        <Activity size={14} className={showHeatmap ? 'animate-pulse' : ''} />
        {showHeatmap ? 'Heatmap On' : 'Heatmap Off'}
      </button>

      <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-3 text-[10px] font-bold text-[var(--text-muted)] backdrop-blur-md">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>SISTEMA ATIVO</span>
        </div>
        <p>
          {LUANDA_TIMEZONE_LABEL} · {Math.abs(currentCenter[0]).toFixed(4)}° {currentCenter[0] < 0 ? 'S' : 'N'},{' '}
          {Math.abs(currentCenter[1]).toFixed(4)}° {currentCenter[1] > 0 ? 'E' : 'W'}
        </p>
      </div>
    </div>
  );
};
