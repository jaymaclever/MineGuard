import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronRight, Clock, Download, Edit2, Search, Trash2 } from 'lucide-react';
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
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <Search size={12} />
              Log operacional
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Ocorrências</h2>
            <p className="mt-2 text-sm text-zinc-500">Histórico completo, filtros e ações rápidas sobre o registo operacional.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Resultados</p>
              <p className="mt-1 text-2xl font-black text-white">{reports.length}</p>
            </div>
            <a href="/api/reports/export" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:border-primary/40 hover:text-white">
              <Download size={16} />
              Exportar
            </a>
          </div>
        </div>

        <div className="space-y-5 rounded-[1.75rem] border border-zinc-800/70 bg-[linear-gradient(180deg,rgba(20,21,27,0.92),rgba(10,10,13,0.96))] p-5">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-zinc-100">Filtros avançados</h3>
            <p className="mt-1 text-xs text-zinc-500">Ajusta o recorte operacional por categoria, gravidade, agente e intervalo.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoria</label>
              <select className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2.5 text-xs text-zinc-200 focus:border-primary focus:outline-none" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
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
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gravidade</label>
              <select className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2.5 text-xs text-zinc-200 focus:border-primary focus:outline-none" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                <option value="">Todas</option>
                <option value="G1">G1</option>
                <option value="G2">G2</option>
                <option value="G3">G3</option>
                <option value="G4">G4</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</label>
              <select className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2.5 text-xs text-zinc-200 focus:border-primary focus:outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="Aberto">Aberto</option>
                <option value="Concluído">Concluído</option>
                <option value="Aprovado">Aprovado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Data inicial</label>
              <input type="date" className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2.5 text-xs text-zinc-200 focus:border-primary focus:outline-none" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Data final</label>
              <input type="date" className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2.5 text-xs text-zinc-200 focus:border-primary focus:outline-none" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Agente</label>
              <select className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2.5 text-xs text-zinc-200 focus:border-primary focus:outline-none" value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id.toString()}>{user.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={clearFilters} className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/70 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-900">
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card mb-20 overflow-hidden rounded-[2rem] border border-zinc-800/70 md:mb-0">
        <div className="hidden md:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800/70 bg-zinc-950/80">
                <th className="hidden px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 md:table-cell">ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Título / Descrição</th>
                <th className="hidden px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 lg:table-cell">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Gravidade</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</th>
                <th className="hidden px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 sm:table-cell">Agente</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              <AnimatePresence initial={false}>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-zinc-500">
                        <Search size={48} strokeWidth={1} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhuma ocorrência encontrada</p>
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
                      className="group cursor-pointer border-zinc-800/40 transition-all hover:bg-white/[0.025] active:scale-[0.995]"
                    >
                      <td className="hidden px-6 py-4 font-mono text-xs text-zinc-500 md:table-cell">#{report.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {report.fotos_path && (
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-800">
                              <img src={report.fotos_path} alt="Evidência" className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight text-zinc-100">{report.titulo || 'Sem título'}</span>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{report.descricao}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 text-xs font-bold uppercase text-zinc-400 lg:table-cell">{report.categoria}</td>
                      <td className="px-6 py-4"><Badge gravidade={report.gravidade} /></td>
                      <td className="px-6 py-4">
                        <div className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest', report.status === 'Concluído' ? 'border-green-500/20 bg-green-500/10 text-green-400' : report.status === 'Aprovado' ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-zinc-700 bg-zinc-800 text-zinc-500')}>
                          {report.status === 'Concluído' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {report.status || 'Aberto'}
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-[10px] font-bold text-zinc-400">{report.agente_nome.charAt(0)}</div>
                          <span className="text-xs font-medium text-zinc-300">{report.agente_nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); onEditReport(report); }} className="p-2 text-zinc-600 transition-colors hover:text-blue-400" title="Editar">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteReport(report.id); }} className="p-2 text-zinc-600 transition-colors hover:text-red-400" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={18} className="ml-2 text-zinc-600 transition-colors group-hover:text-white" />
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-zinc-800/30 md:hidden">
          {reports.length === 0 ? (
            <div className="p-8 text-center">
              <Search size={30} className="mx-auto text-zinc-700" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Nenhuma ocorrência encontrada</p>
            </div>
          ) : (
            reports.map((report) => (
              <button key={report.id} onClick={() => onOpenReport(report)} className="flex w-full items-center justify-between gap-4 p-4 text-left active:bg-white/[0.03]">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge gravidade={report.gravidade} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{report.categoria}</span>
                  </div>
                  <p className="truncate text-xs font-black uppercase text-zinc-200">{report.titulo || 'Sem título'}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">{report.agente_nome}</p>
                </div>
                <ChevronRight size={16} className="text-zinc-700" />
              </button>
            ))
          )}
        </div>
      </div>

      {reports.length > 0 && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </motion.div>
  );
};
