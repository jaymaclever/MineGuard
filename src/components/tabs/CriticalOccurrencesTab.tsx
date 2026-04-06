import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight, Clock3 } from 'lucide-react';
import { Badge, Card } from '../ui/LayoutComponents';
import { Report } from '../../types';

interface CriticalOccurrencesTabProps {
  reports: Report[];
  setSelectedReport: (report: Report) => void;
}

const hoursOpen = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  return Math.max(0, Math.floor(diff / 36e5));
};

const slaTone = (hours: number) => {
  if (hours >= 24) return 'text-red-400 border-red-500/30 bg-red-500/10';
  if (hours >= 8) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
  return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
};

export const CriticalOccurrencesTab: React.FC<CriticalOccurrencesTabProps> = ({ reports, setSelectedReport }) => {
  const criticalReports = reports
    .filter((report) => report.gravidade === 'G4' || report.gravidade === 'G3')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const openCount = criticalReports.filter((report) => report.status !== 'Concluído').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Ocorrências Críticas</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Painel de priorização para G3 e G4 com foco em tempo em aberto, estado e resposta rápida.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="min-w-[170px] border-red-500/20 bg-red-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Total crítico</p>
            <p className="mt-2 text-3xl font-black text-red-400">{criticalReports.length}</p>
          </Card>
          <Card className="min-w-[170px] border-orange-500/20 bg-orange-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Em aberto</p>
            <p className="mt-2 text-3xl font-black text-orange-400">{openCount}</p>
          </Card>
          <Card className="min-w-[170px] border-emerald-500/20 bg-emerald-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Resolvidas</p>
            <p className="mt-2 text-3xl font-black text-emerald-400">{criticalReports.length - openCount}</p>
          </Card>
        </div>
      </div>

      {criticalReports.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <AlertTriangle className="mx-auto text-zinc-800" size={48} />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-zinc-500">Sem críticos carregados</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {criticalReports.map((report) => {
            const openedFor = hoursOpen(report.timestamp);
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="grid gap-4 rounded-3xl border border-zinc-800/70 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.96))] p-5 text-left transition-all hover:border-primary/30 hover:bg-zinc-900/90 lg:grid-cols-[1.4fr_0.8fr_0.25fr]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge gravidade={report.gravidade} />
                    <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      {report.categoria}
                    </span>
                    <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      {report.agente_nome}
                    </span>
                  </div>
                  <p className="mt-4 text-base font-black uppercase tracking-[0.08em] text-white">{report.titulo || 'Sem título'}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{report.descricao}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${slaTone(openedFor)}`}>
                    <Clock3 size={14} />
                    {openedFor}h em aberto
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Estado</p>
                    <p className="mt-2 text-sm font-black text-white">{report.status || 'Aberto'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <ChevronRight size={20} className="text-zinc-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
