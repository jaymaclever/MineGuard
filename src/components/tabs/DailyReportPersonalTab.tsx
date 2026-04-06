import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Card, Badge } from '../ui/LayoutComponents';
import { Report } from '../../types';

interface DailyReportSummary {
  totalReports: number;
  byGravity: Record<string, number>;
  byCategory: Record<string, number>;
  reports: Report[];
}

interface DailyReportPersonalTabProps {
  dailyReport: DailyReportSummary | null;
  onSelectReport: (report: Report) => void;
}

export const DailyReportPersonalTab: React.FC<DailyReportPersonalTabProps> = ({
  dailyReport,
  onSelectReport,
}) => {
  if (!dailyReport) {
    return (
      <div className="py-20 text-center">
        <Calendar className="mx-auto mb-4 text-zinc-800" size={48} />
        <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">Nenhuma ocorrencia registada hoje</p>
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
      <div className="overflow-hidden rounded-[2rem] border border-zinc-800/70 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_26%),linear-gradient(180deg,rgba(22,23,29,0.94),rgba(10,10,13,0.96))] p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <Calendar size={12} />
              Resumo pessoal
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Meu Dia</h2>
            <p className="mt-2 text-sm text-zinc-500">{new Date().toLocaleDateString('pt-PT')}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Estado do dia</p>
            <p className="mt-1 text-lg font-black text-white">{dailyReport.totalReports ? 'Com atividade' : 'Sem registos'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/30 bg-primary/5">
          <div className="text-center">
            <p className="text-3xl font-black text-primary">{dailyReport.totalReports}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Ocorrencias registadas</p>
          </div>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="text-center">
            <p className="text-3xl font-black text-red-400">{dailyReport.byGravity.G4 || 0}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Critica (G4)</p>
          </div>
        </Card>
        <Card className="border-orange-500/30 bg-orange-500/5">
          <div className="text-center">
            <p className="text-3xl font-black text-orange-400">{dailyReport.byGravity.G3 || 0}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Alta (G3)</p>
          </div>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <div className="text-center">
            <p className="text-3xl font-black text-yellow-400">{(dailyReport.byGravity.G2 || 0) + (dailyReport.byGravity.G1 || 0)}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Baixa/Media</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Distribuicao por Categoria" className="rounded-[1.75rem]">
          <div className="space-y-3">
            {Object.entries(dailyReport.byCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-300">{category}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / Math.max(1, dailyReport.totalReports)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-primary">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Distribuicao por Gravidade" className="rounded-[1.75rem]">
          <div className="space-y-3">
            {Object.entries(dailyReport.byGravity).map(([gravity, count]) => {
              const colors: Record<string, string> = {
                G1: 'bg-blue-500',
                G2: 'bg-yellow-500',
                G3: 'bg-orange-500',
                G4: 'bg-red-500',
              };
              return (
                <div key={gravity} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-zinc-300">{gravity}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
                      <div className={`h-full rounded-full ${colors[gravity] || 'bg-zinc-500'}`} style={{ width: `${(count / Math.max(1, dailyReport.totalReports)) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {dailyReport.reports.length > 0 && (
        <Card title={`Ocorrencias de Hoje (${dailyReport.reports.length})`} className="rounded-[2rem]">
          <div className="space-y-2">
            {dailyReport.reports.map((report) => (
              <button
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-4 text-left transition-all hover:border-primary/40 hover:bg-zinc-900/70"
              >
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.06em] text-zinc-100">{report.titulo || 'Sem titulo'}</p>
                  <p className="mt-1 text-xs text-zinc-500">{report.categoria}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge gravidade={report.gravidade} />
                  <ChevronRight size={16} className="text-zinc-600" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};
