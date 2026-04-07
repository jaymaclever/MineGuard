import React from 'react';
import { motion } from 'motion/react';
import { Clock3, MoonStar, Sun, Sunrise, Users } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { Report } from '../../types';
import { getHourInLuanda } from '../../lib/datetime';

interface ShiftsTabProps {
  reports: Report[];
}

const getShiftLabel = (date: Date) => {
  const hour = getHourInLuanda(date);
  if (hour >= 6 && hour < 14) return 'Turno da manhã';
  if (hour >= 14 && hour < 22) return 'Turno da tarde';
  return 'Turno da noite';
};

const getShiftIcon = (shift: string) => {
  if (shift.includes('manhã')) return Sunrise;
  if (shift.includes('tarde')) return Sun;
  return MoonStar;
};

export const ShiftsTab: React.FC<ShiftsTabProps> = ({ reports }) => {
  const currentShift = getShiftLabel(new Date());
  const currentShiftReports = reports.filter((report) => getShiftLabel(new Date(report.timestamp)) === currentShift);
  const byAgent = currentShiftReports.reduce<Record<string, number>>((acc, report) => {
    acc[report.agente_nome] = (acc[report.agente_nome] || 0) + 1;
    return acc;
  }, {});

  const topAgents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const ShiftIcon = getShiftIcon(currentShift);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_32%),linear-gradient(180deg,var(--surface-1),var(--bg-elevated))]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                <Clock3 size={12} />
                Turnos
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-main)]">{currentShift}</h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
                Vista operacional da atividade do turno atual, carga por agente e volume registado nas entradas carregadas.
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-center">
              <ShiftIcon size={28} className="mx-auto text-primary" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Ocorrências no turno</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-[var(--text-main)]">{currentShiftReports.length}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Agentes ativos</p>
            <p className="mt-2 text-3xl font-black text-emerald-400">{Object.keys(byAgent).length}</p>
          </Card>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Com evidência</p>
            <p className="mt-2 text-3xl font-black text-blue-400">
              {currentShiftReports.filter((report) => Array.isArray(report.photos) && report.photos.length > 0).length}
            </p>
          </Card>
          <Card className="border-red-500/20 bg-red-500/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">G4 no turno</p>
            <p className="mt-2 text-3xl font-black text-red-400">
              {currentShiftReports.filter((report) => report.gravidade === 'G4').length}
            </p>
          </Card>
        </div>
      </div>

      <Card title="Carga por agente" subtitle="Distribuição das ocorrências dentro do turno atual">
        {topAgents.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">Sem atividade registada neste turno.</div>
        ) : (
          <div className="space-y-4">
            {topAgents.map(([agent, count]) => (
              <div key={agent} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[var(--surface-3)] p-3 text-primary">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-[var(--text-main)]">{agent}</p>
                      <p className="text-xs text-[var(--text-muted)]">Atividade consolidada do turno atual</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-primary">{count}</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(count / currentShiftReports.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};
