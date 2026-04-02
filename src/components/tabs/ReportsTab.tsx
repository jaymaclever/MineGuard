import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Search, 
  Download, 
  Clock, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge, PaginationControls } from '../ui/LayoutComponents';
import { Report, User } from '../../types';

interface ReportsTabProps {
  reports: Report[];
  users: User[];
  filters: any;
  pagination: any;
  setSelectedReport: (report: Report) => void;
  currentUser: User;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ 
  reports, 
  users, 
  filters, 
  pagination, 
  setSelectedReport,
  currentUser
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase">Log de Ocorrências</h2>
            <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Histórico completo de registros operacionais</p>
          </div>
          <a href="/api/reports/export" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors flex items-center justify-center">
            <Download size={16} />
          </a>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-xl p-4 space-y-4">
          <h3 className="text-[10px] font-black text-zinc-200 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Filtros Avançados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Categoria</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-zinc-300"
                value={filters.filterCategory}
                onChange={(e) => filters.setFilterCategory(e.target.value)}
              >
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
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Gravidade</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-zinc-300"
                value={filters.filterSeverity}
                onChange={(e) => filters.setFilterSeverity(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="G1">G1 - Crítico</option>
                <option value="G2">G2 - Alto</option>
                <option value="G3">G3 - Médio</option>
                <option value="G4">G4 - Baixo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Status</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-zinc-300"
                value={filters.filterStatus}
                onChange={(e) => filters.setFilterStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="Aberto">Aberto</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Agente</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-zinc-300"
                value={filters.filterAgent}
                onChange={(e) => filters.setFilterAgent(e.target.value)}
              >
                <option value="">Todos</option>
                {users.map(u => (
                  <option key={u.id} value={u.id.toString()}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden mb-20 md:mb-0">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Título / Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Gravidade</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Agente</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              <AnimatePresence initial={false}>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-zinc-500">
                        <Search size={48} strokeWidth={1} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma ocorrência encontrada</p>
                      </div>
                    </td>
                  </tr>
                ) : reports.map((report, index) => (
                  <motion.tr 
                    key={report.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedReport(report)}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer border-zinc-800/40"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">#{report.id}</td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-zinc-100 uppercase tracking-tight">{report.titulo || 'Sem Título'}</span>
                        <p className="text-[10px] text-zinc-500 line-clamp-1 group-hover:line-clamp-none transition-all mt-0.5">{report.descricao}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{report.categoria}</span>
                    </td>
                    <td className="px-6 py-4"><Badge gravidade={report.gravidade} /></td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        report.status === 'Concluído' 
                          ? "bg-green-500/10 text-green-400 border-green-500/20" 
                          : "bg-zinc-800 text-zinc-500 border-zinc-700"
                      )}>
                        {report.status === 'Concluído' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {report.status || 'Aberto'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {report.agente_nome.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-zinc-300">{report.agente_nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={18} className="text-zinc-700 group-hover:text-primary transition-colors inline-block" />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-800/30">
          {reports.map((report) => (
            <div 
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="p-4 active:bg-white/[0.03] flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge gravidade={report.gravidade} />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{report.categoria}</span>
                </div>
                <p className="text-xs font-black text-zinc-200 uppercase truncate">{report.titulo || 'Sem Título'}</p>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold">{report.agente_nome}</p>
              </div>
              <ChevronRight size={16} className="text-zinc-700" />
            </div>
          ))}
        </div>
      </div>
      
      {reports.length > 0 && pagination.totalPages > 1 && (
        <PaginationControls 
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setCurrentPage}
        />
      )}
    </motion.div>
  );
};
