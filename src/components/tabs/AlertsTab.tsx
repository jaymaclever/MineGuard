import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, BellRing, CheckCircle2, Plus, Search, ShieldAlert, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';
import { formatDateTime } from '../../lib/datetime';
import { ALERT_AUDIENCE_OPTIONS, getAlertAudienceLabel } from '../../lib/alertAudience';

interface AlertItem {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: 'aviso' | 'critico' | 'informativo' | string;
  creator_name?: string;
  created_by?: number;
  timestamp: string;
  read?: number;
  expires_at?: string | null;
  expires_in_hours?: number | null;
  target_audience?: string | null;
  pinned?: number | boolean;
}

interface AlertFormState {
  titulo: string;
  mensagem: string;
  tipo: string;
  expiresInHours: string;
  isTemporary: boolean;
  targetAudience: string;
  pinned: boolean;
}

interface AlertsTabProps {
  alerts: AlertItem[];
  currentUser: any;
  newAlert: AlertFormState;
  setNewAlert: React.Dispatch<React.SetStateAction<AlertFormState>>;
  onCreateAlert: (event: React.FormEvent) => void;
  onStartEditAlert: (alert: AlertItem) => void;
  onDeleteAlert: (id: number) => void;
  onMarkAlertRead?: (id: number) => Promise<void> | void;
}

const alertTheme = {
  critico: {
    tone: 'border-red-500/20 bg-red-500/10',
    badge: 'bg-red-500 text-white',
    accent: 'text-red-300',
  },
  aviso: {
    tone: 'border-orange-500/20 bg-orange-500/10',
    badge: 'bg-orange-500 text-white',
    accent: 'text-orange-300',
  },
  informativo: {
    tone: 'border-sky-500/20 bg-sky-500/10',
    badge: 'bg-sky-500 text-white',
    accent: 'text-sky-300',
  },
} as const;

function getTimeLeft(expiresAt: string | null | undefined, t: (key: string, options?: any) => string) {
  if (!expiresAt) return t('app.alertsTab.timeLeft.noExpiration');
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return t('app.alertsTab.timeLeft.expired');
  const hours = Math.max(1, Math.ceil(diff / (1000 * 60 * 60)));
  if (hours < 24) return t('app.alertsTab.timeLeft.hours', { count: hours });
  const days = Math.ceil(hours / 24);
  return t('app.alertsTab.timeLeft.days', { count: days });
}

export const AlertsTab: React.FC<AlertsTabProps> = ({
  alerts,
  currentUser,
  newAlert,
  setNewAlert,
  onCreateAlert,
  onStartEditAlert,
  onDeleteAlert,
  onMarkAlertRead,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const alertTypeLabels = {
    critico: t('app.alertsTab.types.critical'),
    aviso: t('app.alertsTab.types.warning'),
    informativo: t('app.alertsTab.types.info'),
  };

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alerts;
    return alerts.filter((alert) =>
      [alert.titulo, alert.mensagem, alert.creator_name, alert.tipo, alert.expires_in_hours, alert.expires_at]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query)),
    );
  }, [alerts, search]);

  const counters = useMemo(() => {
    return filteredAlerts.reduce(
      (acc, alert) => {
        if (alert.tipo === 'critico') acc.critical += 1;
        if (alert.tipo === 'aviso') acc.warning += 1;
        if (alert.tipo === 'informativo') acc.info += 1;
        if (!alert.read) acc.unread += 1;
        return acc;
      },
      { critical: 0, warning: 0, info: 0, unread: 0 },
    );
  }, [filteredAlerts]);

  const canManage = (alert: AlertItem) => currentUser?.permissions?.edit_own_alerts && currentUser?.id === alert.created_by;

  const markAsRead = async (alertId: number) => {
    try {
      if (onMarkAlertRead) {
        await onMarkAlertRead(alertId);
      } else {
        const res = await fetch(`/api/alerts/${alertId}/read`, {
          method: 'PATCH',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(t('app.alertsTab.feedback.markReadError'));
      }
      toast.success(t('app.alertsTab.feedback.markReadSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('app.alertsTab.feedback.markReadError'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.15),transparent_28%),linear-gradient(180deg,var(--surface-1),var(--surface-2))] p-5 md:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              <BellRing size={12} />
              {t('app.alertsTab.heroBadge')}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-main)]">{t('app.alertsTab.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              {t('app.alertsTab.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.alertsTab.metrics.critical')}</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-main)]">{counters.critical}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.alertsTab.metrics.warning')}</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-main)]">{counters.warning}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.alertsTab.metrics.info')}</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-main)]">{counters.info}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.alertsTab.metrics.unread')}</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-main)]">{counters.unread}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)]">
        {currentUser?.permissions?.create_alerts && (
          <Card title={t('app.alertsTab.newAlert.title')} subtitle={t('app.alertsTab.newAlert.subtitle')} className="rounded-[1.75rem]">
            <form onSubmit={onCreateAlert} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('app.alertsTab.form.title')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('app.alertsTab.form.titlePlaceholder')}
                  value={newAlert.titulo}
                  onChange={(event) => setNewAlert((current) => ({ ...current, titulo: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('app.alertsTab.form.message')}</label>
                <textarea
                  required
                  placeholder={t('app.alertsTab.form.messagePlaceholder')}
                  value={newAlert.mensagem}
                  onChange={(event) => setNewAlert((current) => ({ ...current, mensagem: event.target.value }))}
                  className="min-h-[120px] w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('app.alertsTab.form.type')}</label>
                  <select
                    value={newAlert.tipo}
                    onChange={(event) => setNewAlert((current) => ({
                      ...current,
                      tipo: event.target.value,
                      pinned: event.target.value === 'critico' ? true : current.pinned,
                      expiresInHours: event.target.value === 'critico' ? '72' : current.expiresInHours,
                    }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-primary"
                  >
                    <option value="aviso">{t('app.alertsTab.types.warning')}</option>
                    <option value="critico">{t('app.alertsTab.types.critical')}</option>
                    <option value="informativo">{t('app.alertsTab.types.info')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('app.alertsTab.form.expiration')}</label>
                  <select
                    value={newAlert.expiresInHours}
                    onChange={(event) => setNewAlert((current) => ({ ...current, expiresInHours: event.target.value, isTemporary: event.target.value !== '0' }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-primary"
                  >
                    <option value="1">{t('app.alertsTab.expiration.oneHour')}</option>
                    <option value="6">{t('app.alertsTab.expiration.sixHours')}</option>
                    <option value="24">{t('app.alertsTab.expiration.day')}</option>
                    <option value="72">{t('app.alertsTab.expiration.threeDays')}</option>
                    <option value="0">{t('app.alertsTab.expiration.permanent')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('app.alertsTab.form.audience')}</label>
                  <select
                    value={newAlert.targetAudience}
                    onChange={(event) => setNewAlert((current) => ({ ...current, targetAudience: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-primary"
                  >
                    {ALERT_AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`app.alertsTab.audience.${option.value}`, { defaultValue: option.label })}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.alertsTab.form.pin')}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{t('app.alertsTab.form.pinHelp')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newAlert.pinned}
                    onChange={(event) => setNewAlert((current) => ({ ...current, pinned: event.target.checked }))}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              </div>

              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:brightness-110">
                <Plus size={14} strokeWidth={3} />
                {t('app.alertsTab.form.submit')}
              </button>
            </form>
          </Card>
        )}

        <Card title={t('app.alertsTab.panel.title', { count: filteredAlerts.length })} subtitle={t('app.alertsTab.panel.subtitle')} className="rounded-[1.75rem]">
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('app.alertsTab.panel.searchPlaceholder')}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] py-3 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none focus:border-primary"
              />
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
                <ShieldAlert className="text-[var(--text-faint)]" size={34} />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-main)]">{t('app.alertsTab.panel.emptyTitle')}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{t('app.alertsTab.panel.emptySubtitle')}</p>
                </div>
              </div>
            ) : (
              <div className="custom-scrollbar max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {filteredAlerts.map((alert) => {
                  const theme = alertTheme[(alert.tipo as keyof typeof alertTheme) || 'informativo'] || alertTheme.informativo;
                  const canManageAlert = canManage(alert);
                  return (
                    <div key={alert.id} className={cn('rounded-2xl border p-4 transition-colors', theme.tone, !alert.read && 'ring-1 ring-primary/20')}>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-[var(--text-main)]">{alert.titulo}</h4>
                          {alert.pinned ? (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-primary">
                                {t('app.alertsTab.panel.pinned')}
                              </span>
                            ) : null}
                            {!alert.read && (
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-primary">
                                {t('app.alertsTab.panel.new')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {t('app.alertsTab.panel.byAuthor', { author: alert.creator_name || t('app.alertsTab.panel.systemAuthor') })} · {formatDateTime(alert.timestamp)}
                          </p>
                        </div>
                        <span className={cn('rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em]', theme.badge)}>
                          {alertTypeLabels[(alert.tipo as keyof typeof alertTypeLabels) || 'informativo'] || alertTypeLabels.informativo}
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-[var(--text-main)]">{alert.mensagem}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1">
                          {alert.expires_at ? t('app.alertsTab.panel.expiresAt', { time: getTimeLeft(alert.expires_at, t) }) : t('app.alertsTab.timeLeft.noExpiration')}
                        </span>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1">
                          {t(`app.alertsTab.audience.${alert.target_audience || 'all'}`, { defaultValue: getAlertAudienceLabel(alert.target_audience) })}
                        </span>
                        <button
                          type="button"
                          onClick={() => markAsRead(alert.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[var(--text-main)] transition-colors hover:border-primary/30 hover:text-primary"
                        >
                          <CheckCircle2 size={12} /> {t('app.alertsTab.panel.read')}
                        </button>
                      </div>

                      {canManageAlert && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onStartEditAlert(alert)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-sky-300 transition-all hover:bg-sky-500/25"
                          >
                            <Pencil size={12} /> {t('app.alertsTab.actions.edit')}
                          </button>
                          <button
                            onClick={() => onDeleteAlert(alert.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500/25"
                          >
                            <Trash2 size={12} /> {t('app.alertsTab.actions.delete')}
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
