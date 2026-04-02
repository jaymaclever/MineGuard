import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Card, Badge } from '../ui/LayoutComponents';
import { Report } from '../../types';

interface DailyReportPersonalTabProps {
  dailyReport: any;
  onSelectReport: (report: Report) => void;
}

export const DailyReportPersonalTab: React.FC<DailyReportPersonalTabProps> = ({ 
  dailyReport, 
  onSelectReport 
}) => {
  if (!dailyReport) {
    return (
      <div className="py-20 text-center">
        <Calendar className="mx-auto text-zinc-800 mb-4 opacity-20" size={48} />
        <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Nenhuma ocorrência registrada hoje</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-black tracking-tighter uppercase">Meu Relatório do Dia</h2>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">{new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <div className="text-center">
            <p className="text-3xl font-black text-primary">{dailyReport.totalReports}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Ocorrências</p>
          </div>
        </Card>
        
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="text-center">
            <p className="text-3xl font-black text-red-400">{dailyReport.byGravity.G4}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Crítica (G4)</p>
          </div>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <div className="text-center">
            <p className="text-3xl font-black text-orange-400">{dailyReport.byGravity.G3}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Alta (G3)</p>
          </div>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <div className="text-center">
            <p className="text-3xl font-black text-yellow-400">{(dailyReport.byGravity.G2 || 0) + (dailyReport.byGravity.G1 || 0)}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Baixa/Média</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribuição por Categoria">
          <div className="space-y-3">
            {Object.entries(dailyReport.byCategory).map(([cat, count]: [string, any]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-bold uppercase tracking-tighter">{cat}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{width: `${(count / dailyReport.totalReports) * 100}%`}}
                    />
                  </div>
                  <span className="text-xs font-black text-primary">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Distribuição por Gravidade">
          <div className="space-y-3">
            {Object.entries(dailyReport.byGravity).map(([gravity, count]: [string, any]) => {
              const colors = { G1: 'bg-blue-500', G2: 'bg-yellow-500', G3: 'bg-orange-500', G4: 'bg-red-500' };
              return (
                <div key={gravity} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-black uppercase">{gravity}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${colors[gravity as keyof typeof colors]}`}
                        style={{width: dailyReport.totalReports > 0 ? `${(count / dailyReport.totalReports) * 100}%` : '0'}}
                      />
                    </div>
                    <span className="text-xs font-black">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {dailyReport.reports && dailyReport.reports.length > 0 && (
        <Card title={`Ocorrências de Hoje (${dailyReport.reports.length})`}>
          <div className="space-y-2">
            {dailyReport.reports.map((report: Report) => (
              <div 
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl hover:border-primary/50 cursor-pointer transition-all group"
              >
                <div className="flex-1">
                  <p className="text-sm font-black text-zinc-100 uppercase tracking-tight">{report.titulo || 'Sem título'}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{report.categoria}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge gravidade={report.gravidade} />
                  <ChevronRight size={16} className="text-zinc-700 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};
