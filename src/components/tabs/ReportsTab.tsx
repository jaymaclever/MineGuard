import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ChevronRight, Clock, Download, Edit2, Lock, Search, Trash2 } from 'lucide-react';
import { Badge, PaginationControls } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';
import { Report, User } from '../../types';

interface ReportsTabProps {
  reports: Report[];
  users: User[];
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterSeverity: string;
  setFilterSeverity: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (value: string) => void;
  filterDateTo: string;
  setFilterDateTo: (value: string) => void;
  filterAgent: string;
  setFilterAgent: (value: string) => void;
  clearFilters: () => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onOpenReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onDeleteReport: (id: number) => void;
}

const selectClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-xs text-[var(--text-main)] outline-none transition-colors focus:border-primary';
const chipClass = 'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest';

export const ReportsTab: React.FC<ReportsTabProps> = ({
  reports,
  users,
  filterCategory,
  setFilterCategory,
  filterSeverity,
  setFilterSeverity,
  filterStatus,
  setFilterStatus,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  filterAgent,
  setFilterAgent,
  clearFilters,
  currentPage,
  totalPages,
  setCurrentPage,
  onOpenReport,
  onEditReport,
  onDeleteReport,
}) => {
  const hasActiveFilters = Boolean(filterCategory || filterSeverity || filterStatus || filterDateFrom || filterDateTo || filterAgent);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <Search size={12} />
              Log operacional
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)] md:text-[2rem]">Ocorrências</h2>
              <p className="text-sm text-[var(--text-muted)]">Histórico completo, filtros e ações rápidas sobre o registo operacional.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Resultados</p>
              <p className="mt-1 text-xl font-black text-[var(--text-main)]">{reports.length}</p>
            </div>
            {hasActiveFilters && (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/80">Leitura ativa</p>
                <p className="mt-1 text-sm font-black text-[var(--text-main)]">Filtros aplicados</p>
              </div>
            )}
            <a
              href="/api/reports/export"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Download size={16} />
              Exportar
            </a>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-1)] p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--text-main)]">Filtros avançados</h3>
              <p className="text-xs text-[var(--text-muted)]">Ajusta o recorte operacional por categoria, gravidade, agente e intervalo.</p>
            </div>
            {hasActiveFilters && (
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Filtros ativos
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Categoria</label>
              <select className={selectClass} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">Todas</option>
                <option value="Valores">Valores</option>
                <option value="Perímetro">Perímetro</option>
                <option value="Logística">Logística</option>
                <option value="Safety">Safety</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Informativo">Informativo</option>
                <option value="Operativo">Operativo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Gravidade</label>
              <select className={selectClass} value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                <option value="">Todas</option>
                <option value="G1">G1</option>
                <option value="G2">G2</option>
                <option value="G3">G3</option>
                <option value="G4">G4</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Estado</label>
              <select className={selectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="Aberto">Aberto</option>
                <option value="Concluído">Concluído</option>
                <option value="Aprovado">Aprovado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data inicial</label>
              <input type="date" className={selectClass} value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data final</label>
              <input type="date" className={selectClass} value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Agente</label>
              <select className={selectClass} value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id.toString()}>
                    {user.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card mb-20 overflow-hidden rounded-[1.75rem] border border-[var(--border)] md:mb-0">
        <div className="hidden md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                <th className="hidden px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)] md:table-cell">ID</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Título / descrição</th>
                <th className="hidden px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)] lg:table-cell">Categoria</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Gravidade</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Estado</th>
                <th className="hidden px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)] sm:table-cell">Agente</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/30">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-[var(--text-muted)]">
                      <Search size={48} strokeWidth={1} className="opacity-20" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhuma ocorrência encontrada</p>
                      <p className="max-w-md text-sm text-[var(--text-muted)]">Experimente remover filtros ou registar uma nova ocorrência para alimentar o histórico operacional.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report, index) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onOpenReport(report)}
                    className="group cursor-pointer transition-all hover:bg-white/[0.03] active:scale-[0.995]"
                  >
                    <td className="hidden px-4 py-3.5 font-mono text-xs text-[var(--text-muted)] md:table-cell">#{report.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {report.fotos_path && (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                            <img src={report.fotos_path} alt="Evidência" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <span className="text-xs font-black uppercase tracking-tight text-[var(--text-main)]">{report.titulo || 'Sem título'}</span>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--text-muted)]">{report.descricao}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-xs font-bold uppercase text-[var(--text-soft)] lg:table-cell">{report.categoria}</td>
                    <td className="px-4 py-3.5">
                      <Badge gravidade={report.gravidade} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className={cn(
                          chipClass,
                          report.status === 'Concluído'
                            ? 'border-green-500/20 bg-green-500/10 text-green-400'
                            : report.status === 'Aprovado'
                              ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                              : 'border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-muted)]'
                        )}
                      >
                        {report.status === 'Concluído' ? <CheckCircle2 size={10} /> : report.status === 'Aprovado' ? <Lock size={10} /> : <Clock size={10} />}
                        {report.status || 'Aberto'}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface-3)] text-[10px] font-bold text-[var(--text-muted)]">
                          {report.agente_nome.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-[var(--text-soft)]">{report.agente_nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditReport(report);
                          }}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(report.id);
                          }}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={18} className="ml-2 text-[var(--text-faint)] transition-colors group-hover:text-[var(--text-main)]" />
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border)]/30 md:hidden">
          {reports.length === 0 ? (
            <div className="p-8 text-center">
              <Search size={30} className="mx-auto text-[var(--text-faint)]" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Nenhuma ocorrência encontrada</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Ajuste os filtros ou registe uma nova ocorrência.</p>
            </div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                onClick={() => onOpenReport(report)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors active:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge gravidade={report.gravidade} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{report.categoria}</span>
                  </div>
                  <p className="truncate text-xs font-black uppercase text-[var(--text-main)]">{report.titulo || 'Sem título'}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">{report.agente_nome}</p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-faint)]" />
              </button>
            ))
          )}
        </div>
      </div>

      {reports.length > 0 && totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
    </motion.div>
  );
};
