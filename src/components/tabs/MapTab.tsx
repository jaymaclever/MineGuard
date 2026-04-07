import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Loader2, MapPin, Navigation, Save, ShieldCheck, Target, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card } from '../ui/LayoutComponents';
import { OperationsMapPanel } from '../ui/OperationsMapPanel';

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

type SectorLocation = {
  id: number | null;
  sector_name: string;
  location_type: 'point';
  lat: number | null;
  lng: number | null;
  notes?: string;
  is_mapped: boolean;
  updated_at?: string | null;
  updated_by_name?: string | null;
};

interface MapTabProps {
  reports: MapReport[];
  mapCenter: [number, number];
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onOpenReportDetails: (report: MapReport) => void;
}

const SectorPickerLayer = ({
  selectedCoordinates,
  onPick,
}: {
  selectedCoordinates: [number, number] | null;
  onPick: (coords: [number, number]) => void;
}) => {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });

  if (!selectedCoordinates) return null;

  return (
    <CircleMarker
      center={selectedCoordinates}
      radius={11}
      pathOptions={{
        color: 'rgb(var(--primary-rgb))',
        fillColor: 'rgb(var(--primary-rgb))',
        fillOpacity: 0.8,
        weight: 3,
      }}
    >
      <Popup>
        <div className="text-sm font-semibold">Ponto selecionado</div>
      </Popup>
    </CircleMarker>
  );
};

export const MapTab: React.FC<MapTabProps> = ({
  reports,
  mapCenter,
  showHeatmap,
  onToggleHeatmap,
  onOpenReportDetails,
}) => {
  const { t } = useTranslation();
  const [sectorLocations, setSectorLocations] = useState<SectorLocation[]>([]);
  const [selectedSectorName, setSelectedSectorName] = useState('');
  const [draftCoordinates, setDraftCoordinates] = useState<[number, number] | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSectorLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/map/sectors', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || t('app.mapTab.feedback.loadError'));
      }
      const sectors = Array.isArray(data?.sectors) ? data.sectors : [];
      setSectorLocations(sectors);
      if (!selectedSectorName && sectors.length > 0) {
        setSelectedSectorName(sectors[0].sector_name);
      }
    } catch (error: any) {
      toast.error(error?.message || t('app.mapTab.feedback.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSectorLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSector = useMemo(
    () => sectorLocations.find((sector) => sector.sector_name === selectedSectorName) || null,
    [sectorLocations, selectedSectorName],
  );

  useEffect(() => {
    if (!selectedSector) {
      setDraftCoordinates(null);
      setDraftNotes('');
      return;
    }

    setDraftCoordinates(
      selectedSector.is_mapped && selectedSector.lat != null && selectedSector.lng != null
        ? [Number(selectedSector.lat), Number(selectedSector.lng)]
        : null,
    );
    setDraftNotes(selectedSector.notes || '');
  }, [selectedSector]);

  const mappedSectors = sectorLocations.filter((sector) => sector.is_mapped).length;
  const pendingSectors = Math.max(sectorLocations.length - mappedSectors, 0);

  const editorCenter = draftCoordinates || (selectedSector?.is_mapped && selectedSector.lat != null && selectedSector.lng != null
    ? [Number(selectedSector.lat), Number(selectedSector.lng)] as [number, number]
    : mapCenter);

  const saveSectorLocation = async () => {
    if (!selectedSectorName) {
      toast.error(t('app.mapTab.feedback.selectSectorFirst'));
      return;
    }
    if (!draftCoordinates) {
      toast.error(t('app.mapTab.feedback.pickPointFirst'));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/map/sectors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sector_name: selectedSectorName,
          lat: draftCoordinates[0],
          lng: draftCoordinates[1],
          notes: draftNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || t('app.mapTab.feedback.saveError'));
      }
      setSectorLocations(Array.isArray(data?.sectors) ? data.sectors : []);
      toast.success(t('app.mapTab.feedback.saveSuccess'));
    } catch (error: any) {
      toast.error(error?.message || t('app.mapTab.feedback.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const clearSectorLocation = async () => {
    if (!selectedSectorName) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/map/sectors/${encodeURIComponent(selectedSectorName)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || t('app.mapTab.feedback.clearError'));
      }
      setSectorLocations(Array.isArray(data?.sectors) ? data.sectors : []);
      setDraftCoordinates(null);
      setDraftNotes('');
      toast.success(t('app.mapTab.feedback.clearSuccess'));
    } catch (error: any) {
      toast.error(error?.message || t('app.mapTab.feedback.clearError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[1.8rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.14),transparent_30%),linear-gradient(180deg,var(--surface-1),var(--surface-2))] p-4 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <MapPin size={12} />
              {t('app.mapTab.badge')}
            </div>
            <h2 className="mt-3 text-[1.9rem] font-black tracking-tight text-[var(--text-main)] md:text-[2.4rem]">
              {t('app.mapTab.title')}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)] md:text-[15px]">
              {t('app.mapTab.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[540px]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {t('app.mapTab.metrics.georeferenced')}
              </p>
              <p className="mt-2 text-xl font-black text-[var(--text-main)]">
                {reports.filter((report) => Number(report.coords_lat) && Number(report.coords_lng)).length}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {t('app.mapTab.metrics.mappedSectors')}
              </p>
              <p className="mt-2 text-xl font-black text-[var(--text-main)]">{mappedSectors}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {t('app.mapTab.metrics.pendingSectors')}
              </p>
              <p className="mt-2 text-xl font-black text-[var(--text-main)]">{pendingSectors}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card title={t('app.mapTab.editor.sidebarTitle')} subtitle={t('app.mapTab.editor.sidebarSubtitle')}>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)]">
              {t('app.mapTab.editor.instructions')}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--text-muted)]">
                <Loader2 size={16} className="animate-spin text-primary" />
                {t('app.mapTab.editor.loading')}
              </div>
            ) : sectorLocations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--text-muted)]">
                {t('app.mapTab.editor.empty')}
              </div>
            ) : (
              <div className="space-y-2">
                {sectorLocations.map((sector) => (
                  <button
                    key={sector.sector_name}
                    type="button"
                    onClick={() => setSelectedSectorName(sector.sector_name)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      sector.sector_name === selectedSectorName
                        ? 'border-primary bg-primary/10'
                        : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--text-main)]">{sector.sector_name}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {sector.is_mapped
                            ? t('app.mapTab.editor.statusMapped')
                            : t('app.mapTab.editor.statusPending')}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-3 w-3 rounded-full ${
                          sector.is_mapped ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]' : 'bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.16)]'
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title={t('app.mapTab.editor.mapTitle')} subtitle={t('app.mapTab.editor.mapSubtitle')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative h-[420px] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)]">
                <MapContainer center={editorCenter} zoom={14} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />

                  {sectorLocations
                    .filter((sector) => sector.is_mapped && sector.lat != null && sector.lng != null)
                    .map((sector) => (
                      <CircleMarker
                        key={sector.sector_name}
                        center={[Number(sector.lat), Number(sector.lng)]}
                        radius={sector.sector_name === selectedSectorName ? 10 : 7}
                        pathOptions={{
                          color: sector.sector_name === selectedSectorName ? 'rgb(var(--primary-rgb))' : 'rgba(255,255,255,0.8)',
                          fillColor: sector.sector_name === selectedSectorName ? 'rgb(var(--primary-rgb))' : '#38bdf8',
                          fillOpacity: 0.9,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div className="min-w-[150px]">
                            <p className="text-sm font-black">{sector.sector_name}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {sector.updated_by_name
                                ? t('app.mapTab.editor.updatedBy', { user: sector.updated_by_name })
                                : t('app.mapTab.editor.statusMapped')}
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}

                  <SectorPickerLayer selectedCoordinates={draftCoordinates} onPick={setDraftCoordinates} />
                </MapContainer>

                <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-[11px] font-bold text-[var(--text-muted)] shadow-lg backdrop-blur">
                  {selectedSectorName
                    ? t('app.mapTab.editor.selectedSectorHint', { sector: selectedSectorName })
                    : t('app.mapTab.editor.pickSectorHint')}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {t('app.mapTab.editor.currentSector')}
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--text-main)]">
                    {selectedSectorName || t('app.mapTab.editor.noSectorSelected')}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    <Target size={14} className="text-primary" />
                    {t('app.mapTab.editor.coordinates')}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--text-main)]">
                    {draftCoordinates
                      ? `${draftCoordinates[0].toFixed(6)}, ${draftCoordinates[1].toFixed(6)}`
                      : t('app.mapTab.editor.coordinatesEmpty')}
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {t('app.mapTab.editor.notes')}
                  </label>
                  <textarea
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    placeholder={t('app.mapTab.editor.notesPlaceholder')}
                    className="min-h-[110px] w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-main)] outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={saveSectorLocation}
                    disabled={saving || !selectedSectorName}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {t('app.mapTab.editor.save')}
                  </button>
                  <button
                    type="button"
                    onClick={clearSectorLocation}
                    disabled={saving || !selectedSector?.is_mapped}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition hover:border-rose-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    {t('app.mapTab.editor.clear')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title={t('app.mapTab.mapCardTitle')} subtitle={t('app.mapTab.mapCardSubtitle')}>
        <OperationsMapPanel
          reports={reports}
          initialCenter={mapCenter}
          showHeatmap={showHeatmap}
          onToggleHeatmap={onToggleHeatmap}
          onOpenReportDetails={onOpenReportDetails}
        />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title={t('app.mapTab.cards.sectors.title')} subtitle={t('app.mapTab.cards.sectors.subtitle')}>
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <Navigation size={18} className="mt-0.5 text-primary" />
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {t('app.mapTab.cards.sectors.body')}
            </p>
          </div>
        </Card>

        <Card title={t('app.mapTab.cards.access.title')} subtitle={t('app.mapTab.cards.access.subtitle')}>
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <ShieldCheck size={18} className="mt-0.5 text-primary" />
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {t('app.mapTab.cards.access.body')}
            </p>
          </div>
        </Card>

        <Card title={t('app.mapTab.cards.roadmap.title')} subtitle={t('app.mapTab.cards.roadmap.subtitle')}>
          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text-muted)]">
            <p>{t('app.mapTab.cards.roadmap.item1')}</p>
            <p>{t('app.mapTab.cards.roadmap.item2')}</p>
            <p>{t('app.mapTab.cards.roadmap.item3')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
