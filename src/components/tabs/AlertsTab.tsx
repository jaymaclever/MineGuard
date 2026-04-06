import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, BellRing, Plus, Search } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';

interface AlertItem {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: 'aviso' | 'critico' | 'informativo' | string;
  creator_name?: string;
  created_by?: number;
  timestamp: string;
}

interface AlertFormState {
  titulo: string;
  mensagem: string;
  tipo: string;
}

interface AlertsTabProps {
  alerts: AlertItem[];
  currentUser: any;
  newAlert: AlertFormState;
  setNewAlert: React.Dispatch<React.SetStateAction<AlertFormState>>;
  onCreateAlert: (event: React.FormEvent) => void;
  onStartEditAlert: (alert: AlertItem) => void;
  onDeleteAlert: (id: number) => void;
}

const alertTheme = {
  critico: {
    tone: 'border-red-800/50 bg-red-900/20',
    badge: 'bg-red-500 text-white',
    label: 'Crítico',
  },
  aviso: {
    tone: 'border-orange-800/50 bg-orange-900/20',
    badge: 'bg-orange-500 text-white',
    label: 'Aviso',
  },
  informativo: {
    tone: 'border-blue-800/50 bg-blue-900/20',
    badge: 'bg-blue-500 text-white',
    label: 'Informativo',
  },
} as const;

export const AlertsTab: React.FC<AlertsTabProps> = ({
  alerts,
  currentUser,
  newAlert,
  setNewAlert,
  onCreateAlert,
  onStartEditAlert,
  onDeleteAlert,
}) => {
  const [search, setSearch] = useState('');

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alerts;
    return alerts.filter((alert) =>
      [alert.titulo, alert.mensagem, alert.creator_name, alert.tipo].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [alerts, search]);

  const counters = useMemo(() => {
    return filteredAlerts.reduce(
      (acc, alert) => {
        if (alert.tipo === 'critico') acc.critical += 1;
        if (alert.tipo === 'aviso') acc.warning += 1;
        if (alert.tipo === 'informativo') acc.info += 1;
        return acc;
      },
      { critical: 0, warning: 0, info: 0 }
    );
  }, [filteredAlerts]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            <BellRing size={12} />
            Difusão operacional
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Alertas</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">Centraliza comunicações críticas, avisos rápidos e informação operacional para toda a equipa.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Críticos</p>
            <p className="mt-1 text-2xl font-black text-white">{counters.critical}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Avisos</p>
            <p className="mt-1 text-2xl font-black text-white">{counters.warning}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Informativos</p>
            <p className="mt-1 text-2xl font-black text-white">{counters.info}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
        {currentUser?.permissions?.create_alerts && (
          <Card title="Novo alerta" subtitle="Distribua uma atualização operacional para toda a equipa" className="rounded-[1.75rem]">
            <form onSubmit={onCreateAlert} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Título do alerta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manutenção de emergência"
                  value={newAlert.titulo}
                  onChange={(event) => setNewAlert((current) => ({ ...current, titulo: event.target.value }))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Mensagem</label>
                <textarea
                  required
                  placeholder="Descreva o contexto, o impacto e a ação esperada..."
                  value={newAlert.mensagem}
                  onChange={(event) => setNewAlert((current) => ({ ...current, mensagem: event.target.value }))}
                  className="min-h-[120px] w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo</label>
                <select
                  value={newAlert.tipo}
                  onChange={(event) => setNewAlert((current) => ({ ...current, tipo: event.target.value }))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="aviso">Aviso</option>
                  <option value="critico">Crítico</option>
                  <option value="informativo">Informativo</option>
                </select>
              </div>

              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
                <Plus size={14} strokeWidth={3} />
                Enviar alerta
              </button>
            </form>
          </Card>
        )}

        <Card title={`Painel de alertas (${filteredAlerts.length})`} subtitle="Pesquise, reveja e atualize alertas ativos" className="rounded-[1.75rem]">
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por título, mensagem ou autor..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-zinc-100 focus:border-primary focus:outline-none"
              />
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-8 text-center">
                <AlertTriangle className="text-zinc-600" size={34} />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-300">Nenhum alerta encontrado</p>
                  <p className="mt-2 text-sm text-zinc-500">Ajuste a pesquisa ou crie um novo alerta para iniciar a difusão operacional.</p>
                </div>
              </div>
            ) : (
              <div className="custom-scrollbar max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {filteredAlerts.map((alert) => {
                  const theme = alertTheme[(alert.tipo as keyof typeof alertTheme) || 'informativo'] || alertTheme.informativo;
                  const canManage = currentUser?.id === alert.created_by;
                  return (
                    <div key={alert.id} className={cn('rounded-2xl border p-4 transition-colors', theme.tone)}>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-zinc-100">{alert.titulo}</h4>
                          <p className="mt-1 text-xs text-zinc-400">Por {alert.creator_name || 'Sistema'} • {new Date(alert.timestamp).toLocaleString('pt-PT')}</p>
                        </div>
                        <span className={cn('rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em]', theme.badge)}>
                          {theme.label}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-200">{alert.mensagem}</p>
                      {canManage && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onStartEditAlert(alert)}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-300 transition-all hover:bg-blue-500/25"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => onDeleteAlert(alert.id)}
                            className="rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500/25"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
