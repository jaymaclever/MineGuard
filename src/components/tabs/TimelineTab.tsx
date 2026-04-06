import React from 'react';
import { motion } from 'motion/react';
import { Bell, CalendarClock, ChevronRight, FileText } from 'lucide-react';
import { Badge, Card } from '../ui/LayoutComponents';
import { Report } from '../../types';

interface TimelineTabProps {
  reports: Report[];
  alerts: any[];
  setSelectedReport: (report: Report) => void;
}

type TimelineItem =
  | { kind: 'report'; timestamp: string; id: string; title: string; subtitle: string; report: Report }
  | { kind: 'alert'; timestamp: string; id: string; title: string; subtitle: string; type: string };

export const TimelineTab: React.FC<TimelineTabProps> = ({ reports, alerts, setSelectedReport }) => {
  const items: TimelineItem[] = [
    ...reports.map((report) => ({
      kind: 'report' as const,
      timestamp: report.timestamp,
      id: `report-${report.id}`,
      title: report.titulo || 'Sem título',
      subtitle: `${report.agente_nome} • ${report.categoria}`,
      report,
    })),
    ...alerts.map((alert: any) => ({
      kind: 'alert' as const,
      timestamp: alert.timestamp,
      id: `alert-${alert.id}`,
      title: alert.titulo,
      subtitle: `${alert.creator_name || 'Sistema'} • ${alert.tipo}`,
      type: alert.tipo,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white">Linha do Tempo</h2>
        <p className="mt-2 text-sm text-zinc-500">Sequência cronológica de ocorrências e alertas para leitura operacional contínua.</p>
      </div>

      <Card>
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">Sem eventos para apresentar.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="grid gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/50 p-4 lg:grid-cols-[90px_1fr_auto] lg:items-center">
                <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    {new Date(item.timestamp).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {new Date(item.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.kind === 'report' ? (
                      <>
                        <Badge gravidade={item.report.gravidade} />
                        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                          <FileText size={12} />
                          Ocorrência
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                        <Bell size={12} />
                        Alerta
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-black uppercase tracking-[0.08em] text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.subtitle}</p>
                </div>

                <div className="flex items-center gap-3">
                  {item.kind === 'report' ? (
                    <button
                      onClick={() => setSelectedReport(item.report)}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/15"
                    >
                      Abrir
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      <CalendarClock size={14} />
                      Registo
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  );
};
