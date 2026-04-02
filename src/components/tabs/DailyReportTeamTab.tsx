import React from 'react';
import { motion } from 'motion/react';
import { Users, ChevronRight, Activity } from 'lucide-react';
import { Card, Badge } from '../ui/LayoutComponents';
import { Report } from '../../types';

interface DailyReportTeamTabProps {
  dailyReport: any;
  onSelectReport: (report: Report) => void;
}

export const DailyReportTeamTab: React.FC<DailyReportTeamTabProps> = ({ 
  dailyReport, 
  onSelectReport 
}) => {
  if (!dailyReport || dailyReport.totalReports === 0) {
    return (
      <div className="py-20 text-center">
        <Users className="mx-auto text-zinc-800 mb-4 opacity-20" size={48} />
        <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Nenhuma atividade da equipe registrada hoje</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-black tracking-tighter uppercase">Dia da Equipe</h2>
        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">{new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <div className="text-center">
            <p className="text-3xl font-black text-primary">{dailyReport.totalReports}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Ocorrências Totais</p>
          </div>
        </Card>
        
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="text-center">
            <p className="text-3xl font-black text-red-400">{dailyReport.byGravity.G4}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Críticas (G4)</p>
          </div>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <div className="text-center">
            <p className="text-3xl font-black text-zinc-100">{Object.keys(dailyReport.byAgent).length}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Agentes Ativos</p>
          </div>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Activity size={16} className="text-green-500 animate-pulse" />
              <p className="text-3xl font-black text-zinc-100">100%</p>
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">Cobertura</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Activity Log por Agente">
          <div className="space-y-4">
            {Object.entries(dailyReport.byAgent).map(([agent, count]: [string, any]) => (
              <div key={agent} className="flex items-center justify-between p-3 bg-zinc-900/20 rounded-lg border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                    {agent.charAt(0)}
                  </div>
                  <span className="text-xs font-black text-zinc-300 uppercase tracking-tight">{agent}</span>
                </div>
                <Badge label={`${count} registros`} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Distribuição de Risco">
          <div className="space-y-4">
            {Object.entries(dailyReport.byGravity).map(([gravity, count]: [string, any]) => {
              const colors = { G1: 'bg-blue-500', G2: 'bg-yellow-500', G3: 'bg-orange-500', G4: 'bg-red-500' };
              return (
                <div key={gravity} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-bold uppercase">{gravity}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div 
                        className={`h-full rounded-full ${colors[gravity as keyof typeof colors]}`}
                        style={{width: dailyReport.totalReports > 0 ? `${(count / dailyReport.totalReports) * 100}%` : '0'}}
                      />
                    </div>
                    <span className="text-xs font-black text-zinc-100 min-w-[20px] text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
