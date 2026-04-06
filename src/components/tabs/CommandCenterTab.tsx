import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Bell, Calendar, Camera, ChevronRight, ClipboardList, Plus, Shield, Users } from 'lucide-react';
import { Card, Badge } from '../ui/LayoutComponents';
import { Report, Stats, User } from '../../types';

interface CommandCenterTabProps {
  stats: Stats | null;
  reports: Report[];
  alerts: any[];
  currentUser: User;
  setActiveTab: (tab: any) => void;
  setSelectedReport: (report: Report) => void;
  setIsNewReportModalOpen: (open: boolean) => void;
}

const quickActionClass =
  'rounded-2xl border border-zinc-800/70 bg-zinc-950/60 p-4 text-left transition-all hover:border-primary/40 hover:bg-zinc-900/80';

export const CommandCenterTab: React.FC<CommandCenterTabProps> = ({
  stats,
  reports,
  alerts,
  currentUser,
  setActiveTab,
  setSelectedReport,
  setIsNewReportModalOpen,
}) => {
  const criticalReports = reports
    .filter((report) => report.gravidade === 'G4' || report.gravidade === 'G3')
    .slice(0, 6);

  const latestAlerts = alerts.slice(0, 4);
  const reportsToday = reports.filter((report) => {
    const localDate = new Date(report.timestamp).toLocaleDateString('sv-SE');
    const today = new Date().toLocaleDateString('sv-SE');
    return localDate === today;
  });

  const photosToday = reportsToday.filter((report) => Array.isArray(report.photos) && report.photos.length > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_32%),linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))]">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
              <Shield size={12} />
              Centro de comando
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">Operação sob controlo</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Monitorização central da operação com prioridades do turno, ocorrências críticas, alertas ativos e acesso rápido às ações mais importantes.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800/70 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Ocorrências hoje</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-white">{reportsToday.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Críticas abertas</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-red-400">
                  {criticalReports.filter((report) => report.status !== 'Concluído').length}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Evidências hoje</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-blue-400">{photosToday}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800/70 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Equipa ativa</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-emerald-400">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button className={quickActionClass} onClick={() => setIsNewReportModalOpen(true)}>
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-primary/15 p-3 text-primary">
                  <Plus size={18} />
                </div>
                <ChevronRight size={18} className="text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white">Nova ocorrência</p>
              <p className="mt-1 text-xs text-zinc-500">Abrir registo rápido com foco operacional.</p>
            </button>

            <button className={quickActionClass} onClick={() => setActiveTab('critical_occurrences')}>
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-red-500/15 p-3 text-red-400">
                  <AlertTriangle size={18} />
                </div>
                <ChevronRight size={18} className="text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white">Mesa de críticos</p>
              <p className="mt-1 text-xs text-zinc-500">Priorizar G3 e G4 com contexto de tempo em aberto.</p>
            </button>

            <button className={quickActionClass} onClick={() => setActiveTab('evidence_library')}>
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-400">
                  <Camera size={18} />
                </div>
                <ChevronRight size={18} className="text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white">Biblioteca de evidências</p>
              <p className="mt-1 text-xs text-zinc-500">Ver fotografias anexadas e abrir a ocorrência associada.</p>
            </button>

            <button className={quickActionClass} onClick={() => setActiveTab('shifts')}>
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-400">
                  <Users size={18} />
                </div>
                <ChevronRight size={18} className="text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white">Turno e equipa</p>
              <p className="mt-1 text-xs text-zinc-500">Resumo por agentes, carga e atividade do turno.</p>
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="Frente prioritária" subtitle={`Operador atual: ${currentUser.nome}`}>
          {criticalReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
              Sem ocorrências G3 ou G4 nas entradas carregadas.
            </div>
          ) : (
            <div className="space-y-3">
              {criticalReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-4 text-left transition-all hover:border-primary/40 hover:bg-zinc-900/70"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge gravidade={report.gravidade} />
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{report.categoria}</span>
                    </div>
                    <p className="mt-3 truncate text-sm font-black uppercase tracking-[0.08em] text-white">
                      {report.titulo || 'Sem título'}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{report.descricao}</p>
                  </div>
                  <ChevronRight size={18} className="text-zinc-600" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Alertas recentes" subtitle="Sinais operacionais que exigem atenção">
            <div className="space-y-3">
              {latestAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-500">
                  Nenhum alerta recente.
                </div>
              ) : (
                latestAlerts.map((alert: any) => (
                  <div key={alert.id} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-zinc-900 p-3 text-primary">
                          <Bell size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.08em] text-white">{alert.titulo}</p>
                          <p className="mt-1 text-xs text-zinc-500">{alert.mensagem}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                        {alert.tipo}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Fluxo rápido" subtitle="Atalhos para áreas estratégicas">
            <div className="grid gap-3 sm:grid-cols-2">
              <button className={quickActionClass} onClick={() => setActiveTab('timeline')}>
                <Calendar size={18} className="text-primary" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white">Linha do tempo</p>
              </button>
              <button className={quickActionClass} onClick={() => setActiveTab('daily_reports')}>
                <ClipboardList size={18} className="text-primary" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white">Relatórios diários</p>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
