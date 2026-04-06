import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../../lib/utils';

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

const MapCenterController = ({
  target,
  zoom,
}: {
  target: [number, number] | null;
  zoom: number;
}) => {
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

const MapViewportTracker = ({
  onCenterChange,
}: {
  onCenterChange: (center: [number, number]) => void;
}) => {
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
    <div className="h-[400px] bg-zinc-950 rounded-xl relative overflow-hidden border border-zinc-800/50 z-0">
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
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
              <div className="p-2 min-w-[180px] bg-zinc-950 text-zinc-100">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{report.categoria}</p>
                <p className="text-sm font-bold text-white mb-2">{report.agente_nome}</p>
                <p className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed mb-3 italic">"{report.descricao}"</p>
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-500">{new Date(report.timestamp).toLocaleDateString()}</span>
                  <button
                    onClick={() => onOpenReportDetails(report)}
                    className="text-[10px] font-black text-primary hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Ver Ficha
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
          'absolute top-4 right-4 z-[1000] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-2xl',
          showHeatmap ? 'bg-primary text-black border-primary shadow-primary/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800',
        )}
      >
        <Activity size={14} className={showHeatmap ? 'animate-pulse' : ''} />
        {showHeatmap ? 'Heatmap On' : 'Heatmap Off'}
      </button>

      <div className="absolute bottom-4 right-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-3 rounded-lg text-[10px] font-bold text-zinc-400 z-[1000] pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>SISTEMA ATIVO</span>
        </div>
        <p>
          COORDENADAS: {Math.abs(currentCenter[0]).toFixed(4)}° {currentCenter[0] < 0 ? 'S' : 'N'},{' '}
          {Math.abs(currentCenter[1]).toFixed(4)}° {currentCenter[1] > 0 ? 'E' : 'W'}
        </p>
      </div>
    </div>
  );
};
