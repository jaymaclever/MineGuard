import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Archive, BadgeCheck, BarChart3, CalendarDays, Download, FileDown, FileText, Filter, Loader2, RefreshCw, Search, Send, Sparkles, SquareCheckBig, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Card } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';
import { formatDate, formatDateTime } from '../../lib/datetime';

type LifecycleStatus = 'draft' | 'issued' | 'archived';

type ArchiveItem = {
  id: number;
  reportDate: string;
  title: string;
  code: string;
  generatedAt: string;
  totalReports: number;
  criticalReports: number;
  openReports: number;
  sectorsCovered: number;
  lifecycleStatus: LifecycleStatus;
  issuedAt: string | null;
  archivedAt: string | null;
  approval: { approvedAt: string | null; approvedById: number | null; approvedByName: string | null; approvedByRole: string | null };
  comparison: { previousDate: string; summary: Record<string, { current: number; previous: number; delta: number; direction: 'up' | 'down' | 'flat' }> };
};

type DetailItem = ArchiveItem & {
  summary: { totalReports: number; criticalReports: number; openReports: number; closedReports: number; sectorsCovered: number; activeAgents: number };
  highlights: string[];
  severityBreakdown: Array<{ label: string; value: number }>;
  categoryBreakdown: Array<{ label: string; value: number }>;
  statusBreakdown: Array<{ label: string; value: number }>;
  sectorBreakdown: Array<{ label: string; value: number }>;
  reports: Array<{ id: number; agente_nome: string; agente_nivel: string; titulo: string | null; categoria: string; gravidade: 'G1' | 'G2' | 'G3' | 'G4'; descricao: string; setor: string | null; equipamento: string | null; acao_imediata: string | null; potencial_risco: string | null; status: string; timestamp: string }>;
  html: string;
};

interface Props {
  canGenerate: boolean;
  canExport: boolean;
  canManageLifecycle?: boolean;
}

const lifecycleLabel: Record<LifecycleStatus, string> = { draft: 'Rascunho', issued: 'Emitido', archived: 'Arquivado' };
const lifecycleClass: Record<LifecycleStatus, string> = {
  draft: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  issued: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  archived: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const DailyReportsWorkspaceTab: React.FC<Props> = ({ canGenerate, canExport, canManageLifecycle = false }) => {
  const [reports, setReports] = useState<ArchiveItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<'today' | '7' | '30' | 'custom'>('7');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchFormat, setBatchFormat] = useState<'html' | 'pdf' | 'xlsx'>('pdf');
  const [actionLoading, setActionLoading] = useState(false);

  const loadReports = async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/reports/daily?${params.toString()}`, { credentials: 'include' });
      const data = res.ok ? await res.json() : [];
      const list = Array.isArray(data) ? data : [];
      setReports(list);
      setSelectedIds((current) => current.filter((id) => list.some((item) => item.id === id)));
      if (list.length > 0 && !list.some((item) => item.id === selectedId)) setSelectedId(list[0].id);
      if (list.length === 0) { setSelectedId(null); setDetail(null); }
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar os relatórios diários.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/reports/daily/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao carregar detalhe.');
      setDetail(await res.json());
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar o detalhe do relatório.');
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => { void loadReports(); }, [search, from, to]);
  useEffect(() => { if (selectedId) void loadDetail(selectedId); }, [selectedId]);
  useEffect(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  }, []);

  const summary = useMemo(() => reports.reduce((acc, item) => ({
    total: acc.total + 1,
    draft: acc.draft + (item.lifecycleStatus === 'draft' ? 1 : 0),
    issued: acc.issued + (item.lifecycleStatus === 'issued' ? 1 : 0),
    archived: acc.archived + (item.lifecycleStatus === 'archived' ? 1 : 0),
    reports: acc.reports + (item.totalReports || 0),
    critical: acc.critical + (item.criticalReports || 0),
  }), { total: 0, draft: 0, issued: 0, archived: 0, reports: 0, critical: 0 }), [reports]);

  const setQuickRange = (next: 'today' | '7' | '30') => {
    setRange(next);
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (next === 'today' ? 0 : next === '7' ? 6 : 29));
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/reports/generate-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Falha ao gerar relatório.');
      toast.success('Relatório diário gerado com sucesso.');
      await loadReports();
      if (data.reportId) setSelectedId(data.reportId);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao gerar relatório.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (id: number, format: 'html' | 'pdf' | 'xlsx') => {
    try {
      const res = await fetch(`/api/reports/daily/${id}/export?format=${format}`, { credentials: 'include' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'Não foi possível exportar.');
      }
      downloadBlob(await res.blob(), `relatorio-diario-${id}.${format}`);
      toast.success(`Exportação ${format.toUpperCase()} concluída.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro na exportação.');
    }
  };

  const handleBatchExport = async () => {
    if (selectedIds.length === 0) return toast.error('Selecione pelo menos um relatório.');
    try {
      const res = await fetch('/api/reports/daily/export-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds, format: batchFormat }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'Não foi possível exportar em lote.');
      }
      downloadBlob(await res.blob(), `relatorios-diarios-lote-${batchFormat}.zip`);
      toast.success('Exportação em lote concluída.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar em lote.');
    }
  };

  const handleLifecycle = async (action: 'draft' | 'issued' | 'archived' | 'approve') => {
    if (!detail) return;
    setActionLoading(true);
    try {
      const endpoint = action === 'approve' ? `/api/reports/daily/${detail.id}/approve` : `/api/reports/daily/${detail.id}/status`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(action === 'approve' ? {} : { status: action }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || 'Não foi possível atualizar o relatório.');
      toast.success('Estado do relatório atualizado.');
      await loadReports();
      setDetail(payload.report || payload);
    } catch (error: any) {
      toast.error(error.message || 'Falha ao atualizar o relatório.');
    } finally {
      setActionLoading(false);
    }
  };

  const detailStatus = detail ? lifecycleLabel[detail.lifecycleStatus] : '';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_28%),linear-gradient(180deg,var(--surface-1),var(--surface-2))] p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <FileText size={12} /> Relatórios Diários
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[var(--text-main)] md:text-4xl">Geração, pesquisa e exportação</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">Painel central para relatórios diários, com filtros rápidos, comparação entre dias e ações de ciclo de vida.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">Luanda</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">{summary.total} relatórios</span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">{selectedIds.length} selecionados</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[500px]">
            {[
              ['Total', summary.total],
              ['Rascunhos', summary.draft],
              ['Emitidos', summary.issued],
              ['Arquivados', summary.archived],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
                <p className="mt-2 text-2xl font-black text-[var(--text-main)]">{value as number}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canGenerate && (
        <Card className="rounded-[1.75rem] border-primary/20 bg-[var(--surface-1)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary"><Sparkles size={16} /><h3 className="text-xs font-black uppercase tracking-[0.2em]">Geração rápida</h3></div>
              <p className="text-sm text-[var(--text-muted)]">Gere o relatório diário do dia atual com um clique.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={loadReports} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)]">
                <RefreshCw size={14} className={cn(loadingList && 'animate-spin')} /> Atualizar
              </button>
              <button onClick={handleGenerateNow} disabled={generating} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black disabled:opacity-60">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Gerar agora
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card title="Pesquisa e filtros" subtitle="Intervalos rápidos ou datas personalizadas" className="rounded-[1.75rem]">
            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por título, código ou texto..." className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] py-3 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([['today', 'Hoje'], ['7', '7 dias'], ['30', '30 dias']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setQuickRange(key)} className={cn('rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]', range === key ? 'border-primary/30 bg-primary/10 text-primary' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]')}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={from} onChange={(e) => { setRange('custom'); setFrom(e.target.value); }} className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-primary" />
                <input type="date" value={to} onChange={(e) => { setRange('custom'); setTo(e.target.value); }} className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-primary" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSearch(''); setQuickRange('7'); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)]">
                  <Filter size={14} /> Limpar
                </button>
                <button onClick={loadReports} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  <RefreshCw size={14} className={cn(loadingList && 'animate-spin')} /> Filtrar
                </button>
              </div>
            </div>
          </Card>

          {canExport && (
            <Card title="Exportação em lote" subtitle="Selecione relatórios e exporte de uma vez" className="rounded-[1.75rem]">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'html', 'xlsx'] as const).map((format) => (
                    <button key={format} onClick={() => setBatchFormat(format)} className={cn('rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]', batchFormat === format ? 'border-primary/30 bg-primary/10 text-primary' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]')}>
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={handleBatchExport} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)]">
                  <FileDown size={14} /> Exportar seleção
                </button>
              </div>
            </Card>
          )}

          <Card title="Arquivo diário" subtitle="Clique para abrir o detalhe" className="rounded-[1.75rem]">
            <div className="space-y-3">
              {loadingList ? (
                <div className="flex items-center justify-center py-16 text-[var(--text-muted)]"><Loader2 className="mr-2 animate-spin" size={18} /> A carregar...</div>
              ) : reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-10 text-center">
                  <CalendarDays size={28} className="mx-auto mb-3 text-[var(--text-faint)]" />
                  <p className="text-sm font-bold text-[var(--text-main)]">Sem relatórios neste filtro</p>
                </div>
              ) : reports.map((report) => {
                const active = report.id === selectedId;
                return (
                  <button key={report.id} onClick={() => { setSelectedId(report.id); setSelectedIds((current) => current.includes(report.id) ? current.filter((id) => id !== report.id) : [...current, report.id]); }} className={cn('w-full rounded-2xl border p-4 text-left transition-all', active ? 'border-primary/30 bg-primary/10' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-[0.08em] text-[var(--text-main)]">{report.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">{report.code} · {formatDate(report.reportDate)}</p>
                      </div>
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        <input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => setSelectedIds((current) => current.includes(report.id) ? current.filter((id) => id !== report.id) : [...current, report.id])} className="h-4 w-4 accent-primary" />
                        Selecionar
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]', lifecycleClass[report.lifecycleStatus])}>{lifecycleLabel[report.lifecycleStatus]}</span>
                      <Badge gravidade={report.criticalReports > 0 ? 'G4' : 'G1'} />
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{report.totalReports} ocorrências</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <Card title="Detalhe do relatório" subtitle="Resumo executivo e ações rápidas" className="rounded-[1.75rem]">
          {loadingDetail ? (
            <div className="flex min-h-[420px] items-center justify-center text-[var(--text-muted)]"><Loader2 className="mr-2 animate-spin" size={18} /> A carregar detalhe...</div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_28%),linear-gradient(180deg,var(--surface-1),var(--surface-2))] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em]', lifecycleClass[detail.lifecycleStatus])}>{lifecycleLabel[detail.lifecycleStatus]}</span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{detail.code}</span>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-[var(--text-main)]">{detail.title}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{formatDate(detail.reportDate)} · {formatDateTime(detail.generatedAt)}</p>
                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1">{detail.summary.totalReports} ocorrências</span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1">{detail.summary.criticalReports} críticas</span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1">{detail.summary.openReports} em aberto</span>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:w-[420px]">
                    <button onClick={() => handleExport(detail.id, 'html')} disabled={!canExport} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] disabled:opacity-50">HTML</button>
                    <button onClick={() => handleExport(detail.id, 'pdf')} disabled={!canExport} className="rounded-xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">PDF</button>
                    <button onClick={() => handleExport(detail.id, 'xlsx')} disabled={!canExport} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] disabled:opacity-50">XLSX</button>
                    <button onClick={() => window.open(`/api/reports/daily/${detail.id}/preview`, '_blank', 'noopener,noreferrer')} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]">Pré-visualizar</button>
                  </div>
                </div>
              </div>

              {canManageLifecycle && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <button onClick={() => handleLifecycle('draft')} disabled={actionLoading} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]"><SquareCheckBig size={14} className="mr-2 inline" />Rascunho</button>
                  <button onClick={() => handleLifecycle('issued')} disabled={actionLoading} className="rounded-2xl bg-sky-500/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-sky-300"><Send size={14} className="mr-2 inline" />Emitir</button>
                  <button onClick={() => handleLifecycle('archived')} disabled={actionLoading} className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300"><Archive size={14} className="mr-2 inline" />Arquivar</button>
                  <button onClick={() => handleLifecycle('approve')} disabled={actionLoading} className="rounded-2xl bg-primary/15 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary"><BadgeCheck size={14} className="mr-2 inline" />Aprovar</button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Estado</p><p className="mt-2 text-lg font-black text-[var(--text-main)]">{detailStatus}</p></div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Setores</p><p className="mt-2 text-lg font-black text-[var(--text-main)]">{detail.summary.sectorsCovered}</p></div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Abertas</p><p className="mt-2 text-lg font-black text-[var(--text-main)]">{detail.summary.openReports}</p></div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Encerradas</p><p className="mt-2 text-lg font-black text-[var(--text-main)]">{detail.summary.closedReports}</p></div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Leitura executiva" className="rounded-[1.5rem]"><div className="space-y-3">{detail.highlights.map((item, index) => <div key={`${item}-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-main)]">{item}</div>)}</div></Card>
                <Card title="Comparação com o dia anterior" className="rounded-[1.5rem]"><div className="space-y-3">{Object.entries(detail.comparison.summary).map(([key, metric]) => <div key={key} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"><span className="text-sm font-bold text-[var(--text-main)]">{key}</span><span className={cn('text-sm font-black', metric.delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>{metric.current} ({metric.delta > 0 ? '+' : ''}{metric.delta})</span></div>)}</div></Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card title="Por gravidade" className="rounded-[1.5rem]"><div className="space-y-2">{detail.severityBreakdown.map((item) => <div key={item.label} className="flex items-center justify-between"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></Card>
                <Card title="Por categoria" className="rounded-[1.5rem]"><div className="space-y-2">{detail.categoryBreakdown.map((item) => <div key={item.label} className="flex items-center justify-between"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></Card>
                <Card title="Por setor" className="rounded-[1.5rem]"><div className="space-y-2">{detail.sectorBreakdown.map((item) => <div key={item.label} className="flex items-center justify-between"><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></Card>
              </div>

              <Card title={`Ocorrências consolidadas (${detail.reports.length})`} className="rounded-[1.5rem]"><div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">{detail.reports.map((report) => <div key={report.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><Badge gravidade={report.gravidade} /><span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{formatDateTime(report.timestamp)}</span><span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{report.status}</span></div><p className="text-sm font-black uppercase tracking-[0.08em] text-[var(--text-main)]">{report.titulo || 'Sem título'}</p><p className="text-xs text-[var(--text-muted)]">{report.agente_nome} · {report.agente_nivel} · {report.categoria}</p><p className="text-sm text-[var(--text-muted)]">{report.descricao}</p></div><div className="grid gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] md:min-w-[180px]"><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">Setor: {report.setor || 'Não informado'}</div><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">Equipamento: {report.equipamento || 'Não informado'}</div><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2">Risco: {report.potencial_risco || 'Não informado'}</div></div></div></div>)}</div></Card>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-center"><div className="max-w-md space-y-3"><FileText size={34} className="mx-auto text-[var(--text-faint)]" /><p className="text-lg font-black text-[var(--text-main)]">Selecione um relatório para ver o detalhe</p><p className="text-sm text-[var(--text-muted)]">Aqui vão aparecer o resumo executivo, a comparação com o dia anterior e as ações de ciclo de vida.</p></div></div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};
