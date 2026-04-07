import React from 'react';
import { motion } from 'motion/react';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/LayoutComponents';
import { Report } from '../../types';
import { formatDateTime } from '../../lib/datetime';

interface PersonalReportsTabProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  filters: {
    startDate: string;
    setStartDate: (val: string) => void;
    endDate: string;
    setEndDate: (val: string) => void;
  };
}

export const PersonalReportsTab: React.FC<PersonalReportsTabProps> = ({ 
  reports, 
  onSelectReport, 
  filters 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Meus Relatórios</h2>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Histórico pessoal de ocorrências registradas</p>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data Inicial</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => filters.setStartDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data Final</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => filters.setEndDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-2 flex flex-col justify-end">
            <button 
              onClick={() => {
                filters.setStartDate('');
                filters.setEndDate('');
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black text-[10px] px-4 py-2 rounded-lg transition-all uppercase tracking-widest"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">ID</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Título / Descrição</th>
              <th className="hidden lg:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Gravidade</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Status</th>
              <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Data/Hora</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {reports.map((report) => (
              <tr 
                key={report.id} 
                onClick={() => onSelectReport(report)}
                className="hover:bg-zinc-800/20 transition-colors group cursor-pointer"
              >
                <td className="hidden md:table-cell px-6 py-4 font-mono text-xs text-zinc-500">#{report.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {report.fotos_path && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                        <img src={report.fotos_path} alt="Evidência" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-zinc-100 text-sm uppercase tracking-tight">{report.titulo || 'Sem título'}</p>
                      <p className="text-xs text-zinc-500 line-clamp-1">{report.descricao}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden lg:table-cell px-6 py-4 text-sm text-zinc-400 font-bold uppercase text-[10px]">{report.categoria}</td>
                <td className="px-6 py-4">
                  <Badge gravidade={report.gravidade} />
                </td>
                <td className="px-6 py-4">
                  <span className={cn("text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border", 
                    report.status === 'Concluído' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  )}>
                    {report.status || 'Aberto'}
                  </span>
                </td>
                <td className="hidden md:table-cell px-6 py-4 text-[10px] text-zinc-500 font-bold uppercase">
                  {formatDateTime(report.timestamp, 'pt')}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-zinc-600 hover:text-primary transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && (
          <div className="py-20 text-center">
            <Search className="mx-auto text-zinc-800 mb-4 opacity-20" size={48} />
            <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Nenhum relatório pessoal encontrado</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
