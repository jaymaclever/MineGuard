import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Image as ImageIcon, Layers3, Search, SlidersHorizontal } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { PhotoLightbox, PhotoLightboxItem } from '../ui/PhotoLightbox';
import { Report } from '../../types';

interface EvidenceLibraryTabProps {
  reports: Report[];
  onOpenReportDetails: (report: Report) => void;
}

type DateFilter = 'all' | 'today' | '7d' | '30d';
type SortMode = 'recent' | 'oldest' | 'photos';

const matchesDateFilter = (timestamp: string, filter: DateFilter) => {
  if (filter === 'all') return true;

  const reportDate = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'today') {
    return reportDate >= startOfToday;
  }

  const days = filter === '7d' ? 7 : 30;
  const start = new Date(startOfToday);
  start.setDate(start.getDate() - (days - 1));
  return reportDate >= start;
};

export const EvidenceLibraryTab: React.FC<EvidenceLibraryTabProps> = ({ reports, onOpenReportDetails }) => {
  const [galleryReport, setGalleryReport] = useState<Report | null>(null);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const reportsWithPhotos = useMemo(
    () => reports.filter((report) => Array.isArray(report.photos) && report.photos.length > 0),
    [reports],
  );

  const agentOptions = useMemo(
    () => Array.from(new Set(reportsWithPhotos.map((report) => report.agente_nome).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-PT')),
    [reportsWithPhotos],
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(reportsWithPhotos.map((report) => report.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-PT')),
    [reportsWithPhotos],
  );

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reportsWithPhotos
      .filter((report) => {
        const matchesAgent = agentFilter === 'all' || report.agente_nome === agentFilter;
        const matchesCategory = categoryFilter === 'all' || report.categoria === categoryFilter;
        const matchesDate = matchesDateFilter(report.timestamp, dateFilter);
        const matchesSearch =
          query.length === 0 ||
          [report.titulo, report.descricao, report.agente_nome, report.categoria, report.setor]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));

        return matchesAgent && matchesCategory && matchesDate && matchesSearch;
      })
      .sort((left, right) => {
        if (sortMode === 'photos') {
          return (right.photos?.length || 0) - (left.photos?.length || 0);
        }

        const leftTime = new Date(left.timestamp).getTime();
        const rightTime = new Date(right.timestamp).getTime();
        return sortMode === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
      });
  }, [agentFilter, categoryFilter, dateFilter, reportsWithPhotos, search, sortMode]);

  const galleryItems = useMemo<PhotoLightboxItem[]>(
    () =>
      (galleryReport?.photos ?? []).map((photo, index) => ({
        src: photo.photo_path,
        alt: photo.caption || `${galleryReport?.titulo || 'Ocorrência'} ${index + 1}`,
        caption: photo.caption || undefined,
      })),
    [galleryReport],
  );

  const summary = useMemo(() => {
    const totalPhotos = filteredReports.reduce((sum, report) => sum + (report.photos?.length || 0), 0);
    const uniqueAgents = new Set(filteredReports.map((report) => report.agente_nome)).size;
    const criticalCount = filteredReports.filter((report) => report.gravidade === 'G3' || report.gravidade === 'G4').length;

    return {
      totalReports: filteredReports.length,
      totalPhotos,
      uniqueAgents,
      criticalCount,
    };
  }, [filteredReports]);

  const openGallery = (report: Report, index = 0) => {
    setGalleryReport(report);
    setPhotoViewerIndex(index);
  };

  const clearFilters = () => {
    setSearch('');
    setAgentFilter('all');
    setCategoryFilter('all');
    setDateFilter('30d');
    setSortMode('recent');
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[var(--text-main)]">Biblioteca de Evidências</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              Galeria operacional das fotografias anexadas às ocorrências, pronta para consulta rápida por agente, categoria e período.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Ocorrências</p>
              <p className="mt-2 text-2xl font-black text-[var(--text-main)]">{summary.totalReports}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Fotografias</p>
              <p className="mt-2 text-2xl font-black text-[var(--text-main)]">{summary.totalPhotos}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Agentes</p>
              <p className="mt-2 text-2xl font-black text-[var(--text-main)]">{summary.uniqueAgents}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Críticas</p>
              <p className="mt-2 text-2xl font-black text-[var(--text-main)]">{summary.criticalCount}</p>
            </div>
          </div>
        </div>

        <Card
          className="border border-[var(--border)] bg-[var(--surface-1)]/95"
          title="Filtros da galeria"
          subtitle="Encontre evidências mais depressa, sem depender de scroll manual."
          action={
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <SlidersHorizontal size={14} />
              Biblioteca inteligente
            </div>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,0.7fr))]">
            <label className="relative block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Pesquisa</span>
              <Search size={16} className="pointer-events-none absolute left-4 top-[3rem] text-[var(--text-faint)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Título, descrição, agente ou setor..."
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] pl-11 pr-4 text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-primary/50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Agente</span>
              <select
                value={agentFilter}
                onChange={(event) => setAgentFilter(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-main)] outline-none transition-colors focus:border-primary/50"
              >
                <option value="all">Todos</option>
                {agentOptions.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Categoria</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-main)] outline-none transition-colors focus:border-primary/50"
              >
                <option value="all">Todas</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Período</span>
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-main)] outline-none transition-colors focus:border-primary/50"
              >
                <option value="all">Tudo</option>
                <option value="today">Hoje</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Ordenação</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-main)] outline-none transition-colors focus:border-primary/50"
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="photos">Mais fotografias</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-muted)]">
              {summary.totalReports} ocorrência(s) com {summary.totalPhotos} fotografia(s) após os filtros.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
            >
              Limpar filtros
            </button>
          </div>
        </Card>

        {filteredReports.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <Camera className="mx-auto text-[var(--text-faint)]" size={48} />
              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Sem evidências para estes filtros</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Ajuste agente, categoria, período ou pesquisa para voltar a encontrar registos.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredReports.map((report) => {
              const cover = report.photos?.[0];
              return (
                <article
                  key={report.id}
                  className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]/95 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-[var(--surface-2)]"
                >
                  <button type="button" onClick={() => openGallery(report)} className="block w-full text-left">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface-3)]">
                      {cover ? (
                        <img
                          src={cover.photo_path}
                          alt={cover.caption || report.titulo || 'Evidência'}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon size={36} className="text-[var(--text-faint)]" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                          <Camera size={12} />
                          {report.photos?.length || 0} ficheiro(s)
                        </div>
                        <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                          {report.gravidade}
                        </div>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">{report.agente_nome}</p>
                        <p className="mt-1 text-base font-black text-white">{report.titulo || 'Sem título'}</p>
                      </div>
                    </div>
                  </button>

                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">{report.categoria}</span>
                      {report.setor && <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">{report.setor}</span>}
                    </div>

                    <p className="line-clamp-2 text-sm text-[var(--text-muted)]">{report.descricao}</p>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {new Date(report.timestamp).toLocaleDateString('pt-PT')}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openGallery(report)}
                          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/15"
                        >
                          Visualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenReportDetails(report)}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
                        >
                          <Layers3 size={12} />
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </motion.div>

      <PhotoLightbox
        isOpen={photoViewerIndex !== null}
        items={galleryItems}
        activeIndex={photoViewerIndex ?? 0}
        onClose={() => {
          setPhotoViewerIndex(null);
          setGalleryReport(null);
        }}
        onChangeIndex={(nextIndex) => setPhotoViewerIndex(nextIndex)}
      />
    </>
  );
};
