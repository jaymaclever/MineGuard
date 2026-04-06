import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';

interface DailyReportArchiveItem {
  id: number;
  reportDate: string;
  title: string;
  code: string;
  generatedAt: string;
  totalReports: number;
  criticalReports: number;
  openReports: number;
  sectorsCovered: number;
  lifecycleStatus: 'draft' | 'issued' | 'archived';
  issuedAt: string | null;
  archivedAt: string | null;
  approval: {
    approvedAt: string | null;
    approvedById: number | null;
    approvedByName: string | null;
    approvedByRole: string | null;
  };
  comparison: {
    previousDate: string;
    summary: {
      totalReports: DailyReportComparisonMetric;
      criticalReports: DailyReportComparisonMetric;
      openReports: DailyReportComparisonMetric;
      sectorsCovered: DailyReportComparisonMetric;
      activeAgents: DailyReportComparisonMetric;
    };
  };
}

interface DailyReportBreakdownItem {
  label: string;
  value: number;
}

interface DailyReportComparisonMetric {
  current: number;
  previous: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}

interface DailyReportOccurrence {
  id: number;
  agente_nome: string;
  agente_nivel: string;
  titulo: string | null;
  categoria: string;
  gravidade: 'G1' | 'G2' | 'G3' | 'G4';
  descricao: string;
  setor: string | null;
  equipamento: string | null;
  acao_imediata: string | null;
  potencial_risco: string | null;
  status: string;
  timestamp: string;
}

interface DailyReportDetail {
  id: number;
  reportDate: string;
  title: string;
  code: string;
  generatedAt: string;
  lifecycleStatus: 'draft' | 'issued' | 'archived';
  issuedAt: string | null;
  archivedAt: string | null;
  approval: {
    approvedAt: string | null;
    approvedById: number | null;
    approvedByName: string | null;
    approvedByRole: string | null;
  };
  comparison: DailyReportArchiveItem['comparison'];
  summary: {
    totalReports: number;
    criticalReports: number;
    openReports: number;
    closedReports: number;
    sectorsCovered: number;
    activeAgents: number;
  };
  highlights: string[];
  severityBreakdown: DailyReportBreakdownItem[];
  categoryBreakdown: DailyReportBreakdownItem[];
  statusBreakdown: DailyReportBreakdownItem[];
  sectorBreakdown: DailyReportBreakdownItem[];
  reports: DailyReportOccurrence[];
  html: string;
}

interface Props {
  canGenerate: boolean;
  canExport: boolean;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatDelta = (metric: DailyReportComparisonMetric) =>
  `${metric.delta > 0 ? '+' : ''}${metric.delta} vs ${metric.previous}`;

const StatPill = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 px-4 py-4">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    <p className="mt-3 text-3xl font-black tracking-tight text-zinc-100">{value}</p>
  </div>
);

const lifecycleTheme = {
  draft: {
    label: 'Rascunho',
    className: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  issued: {
    label: 'Emitido',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  archived: {
    label: 'Arquivado',
    className: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  },
} as const;

export const DailyReportsWorkspaceTab: React.FC<Props> = ({ canGenerate, canExport }) => {
  const [items, setItems] = useState<DailyReportArchiveItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyReportDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [generationDate, setGenerationDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const aggregate = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.totalReports += item.totalReports;
        acc.criticalReports += item.criticalReports;
        acc.openReports += item.openReports;
        return acc;
      },
      { totalReports: 0, criticalReports: 0, openReports: 0 }
    );
  }, [items]);

  const loadList = async (preserveSelection = true) => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const response = await fetch(`/api/reports/daily?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao carregar relatórios diários.');
      }

      setItems(data);
      setSelectedIds((current) => current.filter((id) => data.some((item: DailyReportArchiveItem) => item.id === id)));
      if (data.length === 0) {
        setSelectedId(null);
        setSelectedReport(null);
        return;
      }

      if (preserveSelection && selectedId && data.some((item: DailyReportArchiveItem) => item.id === selectedId)) {
        return;
      }

      setSelectedId(data[0].id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar relatórios diários.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadList();
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [search, from, to]);

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const response = await fetch(`/api/reports/daily/${selectedId}`, { credentials: 'include' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Falha ao carregar o relatório selecionado.');
        }

        if (!cancelled) {
          setSelectedReport(data);
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || 'Erro ao carregar o relatório.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports/generate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date: generationDate }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao gerar o relatório diário.');
      }

      toast.success(`Relatório de ${formatDate(data.reportDate)} gerado com sucesso.`);
      await loadList(false);
      if (data.reportId) {
        setSelectedId(data.reportId);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar o relatório.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = (format: 'html' | 'pdf' | 'xlsx') => {
    if (!selectedReport) return;
    window.open(`/api/reports/daily/${selectedReport.id}/export?format=${format}`, '_blank');
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleBatchExport = async (format: 'html' | 'pdf' | 'xlsx') => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um relatório para exportação em lote.');
      return;
    }

    try {
      const response = await fetch('/api/reports/daily/export-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds, format }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha ao exportar o lote.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition');
      const match = disposition?.match(/filename=\"?([^"]+)\"?/);
      anchor.href = url;
      anchor.download = match?.[1] || `relatorios-diarios-${format}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Lote exportado em ${format.toUpperCase()}.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar o lote.');
    }
  };

  const handleLifecycleChange = async (status: 'draft' | 'issued' | 'archived') => {
    if (!selectedReport) return;

    try {
      const response = await fetch(`/api/reports/daily/${selectedReport.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao atualizar o estado do relatório.');
      }

      setSelectedReport(data.report);
      setItems((current) =>
        current.map((item) =>
          item.id === data.report.id
            ? {
                ...item,
                lifecycleStatus: data.report.lifecycleStatus,
                issuedAt: data.report.issuedAt,
                archivedAt: data.report.archivedAt,
              }
            : item
        )
      );
      toast.success(`Relatório marcado como ${lifecycleTheme[status].label.toLowerCase()}.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar o estado do relatório.');
    }
  };

  const handleApprove = async () => {
    if (!selectedReport) return;

    try {
      const response = await fetch(`/api/reports/daily/${selectedReport.id}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao aprovar o relatório.');
      }

      setSelectedReport(data.report);
      setItems((current) =>
        current.map((item) =>
          item.id === data.report.id
            ? {
                ...item,
                lifecycleStatus: data.report.lifecycleStatus,
                issuedAt: data.report.issuedAt,
                archivedAt: data.report.archivedAt,
                approval: data.report.approval,
              }
            : item
        )
      );
      toast.success('Relatório aprovado e assinado com sucesso.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar o relatório.');
    }
  };

  return (
    <motion.div
      key="daily_reports"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <section className="overflow-hidden rounded-[28px] border border-primary/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_28%),linear-gradient(135deg,#050816_0%,#0f172a_52%,#111827_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary/70">Relatórios Diários</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
              Centro de geração, pesquisa e exportação executiva
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
              Consulte o histórico, filtre por período, visualize um preview profissional e exporte o mesmo conteúdo em
              PDF, HTML e XLSX sem sair desta aba.
            </p>
          </div>

          {canGenerate && (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur xl:min-w-[360px]">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Data do Relatório</label>
              <input
                type="date"
                value={generationDate}
                onChange={(event) => setGenerationDate(event.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm font-bold text-zinc-100 outline-none transition focus:border-primary"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Gerar Agora
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatPill label="Relatórios Encontrados" value={items.length} />
        <StatPill label="Ocorrências no Filtro" value={aggregate.totalReports} />
        <StatPill label="Críticas no Arquivo" value={aggregate.criticalReports} />
        <StatPill label="Pendências Abertas" value={aggregate.openReports} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card
          title="Arquivo Diário"
          subtitle="Pesquisa operacional, filtros por intervalo e seleção do relatório base."
          className="h-fit rounded-[2rem] border border-zinc-800/70"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {canExport && (
                <>
                  <button
                    onClick={() => handleBatchExport('html')}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-primary/50 hover:text-primary"
                  >
                    <FileText size={14} />
                    HTML Lote
                  </button>
                  <button
                    onClick={() => handleBatchExport('pdf')}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-primary/50 hover:text-primary"
                  >
                    <Download size={14} />
                    PDF Lote
                  </button>
                  <button
                    onClick={() => handleBatchExport('xlsx')}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-primary/50 hover:text-primary"
                  >
                    <FileSpreadsheet size={14} />
                    XLSX Lote
                  </button>
                </>
              )}
              <button
                onClick={() => loadList(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition hover:border-primary/50 hover:text-primary"
              >
                <RefreshCw size={14} />
                Atualizar
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por data, título, setor ou agente"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-3 pl-11 pr-4 text-sm text-zinc-100 outline-none transition focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">De</label>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Até</label>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-3">
              {loadingList && (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-12 text-zinc-500">
                  <Loader2 className="animate-spin" size={18} />
                </div>
              )}

              {!loadingList && items.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/30 px-6 py-12 text-center">
                  <FileText size={32} className="mx-auto text-zinc-600" />
                  <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Nenhum relatório encontrado
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    Gere um novo consolidado ou ajuste os filtros para localizar o histórico.
                  </p>
                </div>
              )}

              {!loadingList &&
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                      selectedId === item.id
                        ? 'border-primary/40 bg-primary/10 shadow-[0_0_0_1px_rgba(59,130,246,0.16)]'
                        : 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-700 hover:bg-zinc-900/60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleSelection(item.id);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-primary focus:ring-primary"
                          />
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Selecionar</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{item.code}</p>
                          <span
                            className={cn(
                              'rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
                              lifecycleTheme[item.lifecycleStatus].className
                            )}
                          >
                            {lifecycleTheme[item.lifecycleStatus].label}
                          </span>
                        </div>
                        <h3 className="mt-2 text-sm font-black leading-5 text-zinc-100">{item.title}</h3>
                      </div>
                      <Calendar size={16} className="mt-1 text-zinc-500" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                        {formatDate(item.reportDate)}
                      </span>
                      <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                        {item.totalReports} ocorrências
                      </span>
                      <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                        {item.criticalReports} críticas
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">Gerado em {formatDateTime(item.generatedAt)}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {formatDelta(item.comparison.summary.totalReports)} face a {formatDate(item.comparison.previousDate)}
                    </p>
                    {item.issuedAt && (
                      <p className="mt-1 text-xs text-zinc-600">Emitido em {formatDateTime(item.issuedAt)}</p>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {!selectedReport && !loadingDetail && (
            <Card className="rounded-[28px] border-dashed border-zinc-800 bg-zinc-950/20 py-20 text-center">
              <ShieldCheck size={42} className="mx-auto text-zinc-600" />
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Selecione um relatório diário
              </p>
              <p className="mt-2 text-sm text-zinc-600">O preview profissional e as exportações vão aparecer aqui.</p>
            </Card>
          )}

          {loadingDetail && (
            <Card className="flex min-h-[420px] items-center justify-center">
              <Loader2 size={24} className="animate-spin text-zinc-500" />
            </Card>
          )}

          {selectedReport && !loadingDetail && (
            <>
              <section className="overflow-hidden rounded-[28px] border border-zinc-800/70 bg-[linear-gradient(135deg,rgba(9,9,11,0.96),rgba(17,24,39,0.96))]">
                <div className="border-b border-zinc-800/70 p-6 md:p-7">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/70">{selectedReport.code}</p>
                        <span
                          className={cn(
                            'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                            lifecycleTheme[selectedReport.lifecycleStatus].className
                          )}
                        >
                          {lifecycleTheme[selectedReport.lifecycleStatus].label}
                        </span>
                      </div>
                      <h3 className="mt-3 text-2xl font-black tracking-tight text-white">{selectedReport.title}</h3>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                        Pré-visualização executiva com estrutura pronta para auditoria, impressão e distribuição interna.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {canExport && (
                        <>
                          <button
                            onClick={() => handleExport('pdf')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black transition hover:brightness-110"
                          >
                            <Download size={14} />
                            PDF
                          </button>
                          <button
                            onClick={() => handleExport('html')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:border-primary/40 hover:text-primary"
                          >
                            <FileText size={14} />
                            HTML
                          </button>
                          <button
                            onClick={() => handleExport('xlsx')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:border-primary/40 hover:text-primary"
                          >
                            <FileSpreadsheet size={14} />
                            XLSX
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                      Data {formatDate(selectedReport.reportDate)}
                    </span>
                    <span className="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                      Gerado {formatDateTime(selectedReport.generatedAt)}
                    </span>
                    {selectedReport.issuedAt && (
                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                        Emitido {formatDateTime(selectedReport.issuedAt)}
                      </span>
                    )}
                    {selectedReport.archivedAt && (
                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                        Arquivado {formatDateTime(selectedReport.archivedAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                  <StatPill label="Ocorrências" value={selectedReport.summary.totalReports} />
                  <StatPill label="Críticas" value={selectedReport.summary.criticalReports} />
                  <StatPill label="Em aberto" value={selectedReport.summary.openReports} />
                  <StatPill label="Agentes ativos" value={selectedReport.summary.activeAgents} />
                </div>

                {canGenerate && (
                  <div className="border-t border-zinc-800/70 px-6 pb-6 pt-5">
                    <div className="flex flex-wrap gap-3">
                      {(['draft', 'issued', 'archived'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleLifecycleChange(status)}
                          className={cn(
                            'rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
                            selectedReport.lifecycleStatus === status
                              ? `${lifecycleTheme[status].className} border-current`
                              : 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-primary/40 hover:text-primary'
                          )}
                        >
                          Marcar como {lifecycleTheme[status].label}
                        </button>
                      ))}
                      <button
                        onClick={handleApprove}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300 transition-all hover:bg-emerald-500/15"
                      >
                        Assinar / Aprovar
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card
                  title="Comparação com o Dia Anterior"
                  subtitle={`Leitura rápida frente a ${formatDate(selectedReport.comparison.previousDate)}.`}
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      ['Ocorrências', selectedReport.comparison.summary.totalReports],
                      ['Críticas', selectedReport.comparison.summary.criticalReports],
                      ['Em aberto', selectedReport.comparison.summary.openReports],
                      ['Setores', selectedReport.comparison.summary.sectorsCovered],
                      ['Agentes', selectedReport.comparison.summary.activeAgents],
                    ].map(([label, metric]) => (
                      <div key={label as string} className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
                        <p className="mt-3 text-3xl font-black text-zinc-100">{(metric as DailyReportComparisonMetric).current}</p>
                        <p className="mt-2 text-xs text-zinc-500">{formatDelta(metric as DailyReportComparisonMetric)}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Destaques do Dia" subtitle="Leitura rápida para supervisão e auditoria.">
                  <div className="space-y-3">
                    {selectedReport.highlights.map((highlight, index) => (
                      <div key={index} className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-4">
                        <p className="text-sm leading-7 text-zinc-200">{highlight}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Indicadores" subtitle="Quebras consolidadas para leitura executiva.">
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                    {[
                      ['Severidade', selectedReport.severityBreakdown],
                      ['Categoria', selectedReport.categoryBreakdown],
                      ['Status', selectedReport.statusBreakdown],
                      ['Setor', selectedReport.sectorBreakdown],
                    ].map(([label, items]) => (
                      <div key={label as string}>
                        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
                        <div className="space-y-2">
                          {(items as DailyReportBreakdownItem[]).slice(0, 5).map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3 py-3 text-sm"
                            >
                              <span className="text-zinc-300">{item.label}</span>
                              <span className="font-black text-zinc-100">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card title="Assinatura e Aprovação" subtitle="Controle formal de emissão executiva do relatório.">
                {selectedReport.approval.approvedAt ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Aprovado por</p>
                      <p className="mt-3 text-lg font-black text-zinc-100">{selectedReport.approval.approvedByName}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Função</p>
                      <p className="mt-3 text-lg font-black text-zinc-100">{selectedReport.approval.approvedByRole || 'Nao informada'}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Assinado em</p>
                      <p className="mt-3 text-lg font-black text-zinc-100">{formatDateTime(selectedReport.approval.approvedAt)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/30 px-6 py-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Aguardando aprovação</p>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">
                      Use o botão <span className="font-black text-zinc-200">Assinar / Aprovar</span> para transformar este relatório em um documento executivo formal.
                    </p>
                  </div>
                )}
              </Card>

              <Card title="Ocorrências Consolidadas" subtitle="Linha operacional do dia para consulta rápida.">
                <div className="space-y-3">
                  {selectedReport.reports.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-500">
                      Nenhuma ocorrência foi registrada para esta data.
                    </div>
                  )}

                  {selectedReport.reports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 px-4 py-4 md:px-5"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              {formatTime(report.timestamp)}
                            </span>
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                              {report.gravidade}
                            </span>
                            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              {report.categoria}
                            </span>
                            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                              {report.status}
                            </span>
                          </div>
                          <h4 className="mt-3 text-base font-black text-zinc-100">
                            {report.titulo?.trim() || report.descricao.slice(0, 120)}
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-zinc-400">{report.descricao}</p>
                        </div>
                        <div className="min-w-[220px] rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Contexto</p>
                          <div className="mt-3 space-y-2 text-zinc-300">
                            <p><span className="text-zinc-500">Agente:</span> {report.agente_nome}</p>
                            <p><span className="text-zinc-500">Setor:</span> {report.setor || 'Nao informado'}</p>
                            <p><span className="text-zinc-500">Equipamento:</span> {report.equipamento || 'Nao informado'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Preview de Exportação" subtitle="Render final do documento HTML profissional que alimenta os downloads.">
                <iframe
                  title={`preview-${selectedReport.id}`}
                  srcDoc={selectedReport.html}
                  className="h-[780px] w-full rounded-2xl border border-zinc-800/60 bg-white"
                />
              </Card>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
