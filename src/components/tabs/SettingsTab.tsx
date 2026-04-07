import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Download, GitBranch, Globe, HardDrive, Palette, RefreshCw, RotateCcw, Shield, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/LayoutComponents';
import { User } from '../../types';
import { applyThemeSettings, resolveThemePalette, resolveThemeTemplate, themePalettes, themeTemplates } from '../../lib/theme';
import { cn } from '../../lib/utils';

interface SettingsTabProps {
  systemSettings: any[];
  publicSettings: any;
  updateSettings: (settings: any[]) => Promise<boolean>;
  currentUser: User;
  fetchData?: () => void;
}

const inputClass = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-primary';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]';

export const SettingsTab: React.FC<SettingsTabProps> = ({ systemSettings, publicSettings, updateSettings }) => {
  const { t } = useTranslation();
  const getSetting = (key: string, fallback = '') => systemSettings.find((setting) => setting.key === key)?.value || fallback;
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [githubStatus, setGithubStatus] = useState<any>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [githubBranch, setGithubBranch] = useState(getSetting('github_branch', 'main'));
  const [updatingGithub, setUpdatingGithub] = useState(false);
  const [resettingSystem, setResettingSystem] = useState(false);

  const themeMode = publicSettings.app_theme_mode === 'light' ? 'light' : 'dark';
  const palettes = themePalettes.filter((palette) => palette.mode === themeMode);
  const selectedPalette = palettes.find((palette) => palette.id === resolveThemePalette(themeMode, publicSettings.app_theme_palette)) || palettes[0];
  const selectedTemplate = themeTemplates.find((template) => template.id === resolveThemeTemplate(publicSettings.app_theme_template)) || themeTemplates[0];

  useEffect(() => {
    setGithubBranch(getSetting('github_branch', 'main'));
  }, [systemSettings]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [backupRes, githubRes] = await Promise.all([
          fetch('/api/backup/status', { credentials: 'include' }),
          fetch('/api/github/status', { credentials: 'include' }),
        ]);
        if (!mounted) return;
        setBackupStatus(backupRes.ok ? await backupRes.json() : null);
        setGithubStatus(githubRes.ok ? await githubRes.json() : null);
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const backupLabel = useMemo(() => {
    const modifiedAt = backupStatus?.database?.modifiedAt ? new Date(backupStatus.database.modifiedAt) : null;
    if (!modifiedAt) return t('app.settingsTab.noBackupData');
    return `${modifiedAt.toLocaleDateString()} • ${modifiedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [backupStatus, t]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)] md:text-[2rem]">{t('app.settingsTab.title')}</h2>
        <p className="text-sm text-[var(--text-muted)]">{t('app.settingsTab.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t('app.settingsTab.personalization.title')} subtitle={t('app.settingsTab.personalization.subtitle')} className="lg:col-span-2">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const settings = [
                { key: 'app_name', value: formData.get('app_name'), description: 'Application name' },
                { key: 'app_slogan', value: formData.get('app_slogan'), description: 'Application slogan' },
                { key: 'app_theme_mode', value: formData.get('app_theme_mode'), description: 'Theme mode' },
                { key: 'app_theme_palette', value: formData.get('app_theme_palette'), description: 'Theme palette' },
                { key: 'app_theme_template', value: formData.get('app_theme_template'), description: 'Theme template' },
                { key: 'app_layout', value: formData.get('app_layout'), description: 'Application layout' },
              ];
              const success = await updateSettings(settings);
              if (success) {
                const next = { ...publicSettings, ...Object.fromEntries(settings.map((item) => [item.key, item.value])) };
                applyThemeSettings(document.documentElement, next);
              }
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClass}>{t('app.settingsTab.labels.appName')}</label>
                <input name="app_name" defaultValue={publicSettings.app_name} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>{t('app.settingsTab.labels.appSlogan')}</label>
                <input name="app_slogan" defaultValue={publicSettings.app_slogan} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_220px_1fr]">
              <div className="space-y-2">
                <label className={labelClass}>{t('app.settingsTab.labels.themeMode')}</label>
                <select name="app_theme_mode" defaultValue={publicSettings.app_theme_mode} className={inputClass}>
                  <option value="dark">{t('app.settingsTab.options.dark')}</option>
                  <option value="light">{t('app.settingsTab.options.light')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>{t('app.settingsTab.labels.visualTemplate')}</label>
                <select name="app_theme_template" defaultValue={publicSettings.app_theme_template || 'executive'} className={inputClass}>
                  {themeTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>{t('app.settingsTab.labels.systemLayout')}</label>
                <select name="app_layout" defaultValue={publicSettings.app_layout} className={inputClass}>
                  <option value="default">{t('app.settingsTab.options.defaultLayout')}</option>
                  <option value="compact">{t('app.settingsTab.options.compactLayout')}</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    {themeMode === 'light' ? t('app.settingsTab.personalization.lightPalettes') : t('app.settingsTab.personalization.darkPalettes')}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{t('app.settingsTab.personalization.paletteHelp')}</p>
                </div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {palettes.length} {t('app.settingsTab.personalization.options')}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {palettes.map((palette) => (
                  <label key={palette.id} className={cn('cursor-pointer rounded-[1.4rem] border p-4 transition-all', publicSettings.app_theme_palette === palette.id ? 'border-primary bg-primary/8' : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]')}>
                    <input type="radio" name="app_theme_palette" value={palette.id} defaultChecked={publicSettings.app_theme_palette === palette.id} className="sr-only" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--text-main)]">{palette.name}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{palette.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: palette.accent }} />
                        <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: palette.surface }} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <div className="flex items-center gap-2 text-primary">
                <Palette size={15} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('app.settingsTab.personalization.preview')}</h3>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
                <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.personalization.identity')}</p>
                  <p className="mt-2 text-sm font-black text-[var(--text-main)]">{publicSettings.app_name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{publicSettings.app_slogan}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.personalization.panel')}</p>
                  <p className="mt-2 text-base font-black text-[var(--text-main)]">{selectedTemplate.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{selectedPalette?.name}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="rounded-xl bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90">
                {t('app.settingsTab.actions.applyIdentity')}
              </button>
            </div>
          </form>
        </Card>

        <Card title={t('app.settingsTab.language.title')} subtitle={t('app.settingsTab.language.subtitle')}>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Globe size={12} />
              {t('app.settingsTab.language.badge')}
            </div>
            <p className="text-sm text-[var(--text-muted)]">{t('app.settingsTab.language.description')}</p>
          </div>
        </Card>

        <Card title={t('app.settingsTab.backup.title')} subtitle={t('app.settingsTab.backup.subtitle')}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <div className="flex items-center gap-2 text-primary"><HardDrive size={16} /><p className="text-[10px] font-black uppercase tracking-[0.18em]">{t('app.settingsTab.backup.database')}</p></div>
                <p className="mt-2 text-sm font-black text-[var(--text-main)]">{backupStatus?.database?.exists ? `${(backupStatus.database.size / 1024 / 1024).toFixed(2)} MB` : t('app.settingsTab.backup.unavailable')}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">{backupLabel}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.backup.savedBackups')}</p>
                <p className="mt-2 text-2xl font-black text-[var(--text-main)]">{backupStatus?.backups?.length || 0}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">{t('app.settingsTab.backup.backupsDirectory')}</p>
              </div>
            </div>

            <button onClick={async () => {
              const res = await fetch('/api/backup', { credentials: 'include' });
              if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mineguard-backup-${new Date().toISOString().split('T')[0]}.db`;
                a.click();
                toast.success(t('app.settingsTab.backup.downloadSuccess'));
              } else {
                toast.error(t('app.settingsTab.backup.downloadError'));
              }
            }} className="w-full rounded-xl bg-primary/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/20">
              <Download size={14} className="mr-2 inline-block" />{t('app.settingsTab.actions.downloadBackupNow')}
            </button>

            <input type="file" accept=".db,.backup,application/octet-stream" onChange={(event) => setRestoreFile(event.target.files?.[0] || null)} className="block w-full cursor-pointer rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-muted)] file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.16em] file:text-primary-foreground" />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.backup.selectedFile')}</p>
              <p className="mt-2 text-sm text-[var(--text-main)]">{restoreFile ? restoreFile.name : t('app.settingsTab.backup.noFileSelected')}</p>
            </div>

            <button type="button" onClick={async () => {
              if (!restoreFile) return toast.error(t('app.settingsTab.backup.selectFileError'));
              if (!window.confirm(t('app.settingsTab.backup.restoreConfirm'))) return;
              const formData = new FormData();
              formData.append('backupFile', restoreFile);
              const res = await fetch('/api/backup/restore', { method: 'POST', body: formData, credentials: 'include' });
              const data = await res.json();
              if (data.status === 'ok') {
                toast.success(data.message || t('app.settingsTab.backup.restoreSuccess'));
                window.location.reload();
              } else {
                toast.error(data.message || t('app.settingsTab.backup.restoreError'));
              }
            }} className="w-full rounded-xl bg-[var(--surface-1)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition-all hover:bg-[var(--surface-3)]">
              <Upload size={14} className="mr-2 inline-block" />{t('app.settingsTab.actions.restoreSelectedBackup')}
            </button>

            <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-red-500" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500">{t('app.settingsTab.backup.fullReset')}</p>
                  <p className="mt-2 text-sm text-[var(--text-main)]">{t('app.settingsTab.backup.fullResetDescription')}</p>
                </div>
              </div>
              <button type="button" disabled={resettingSystem} onClick={async () => {
                const confirmation = window.prompt(t('app.settingsTab.backup.resetPrompt'));
                if (confirmation === null) return;
                if (confirmation.trim().toUpperCase() !== 'REPOR') return toast.error(t('app.settingsTab.backup.invalidConfirmation'));
                try {
                  setResettingSystem(true);
                  toast.loading(t('app.settingsTab.backup.resetting'));
                  const res = await fetch('/api/system/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ confirmation }) });
                  const data = await res.json();
                  toast.dismiss();
                  if (data.status !== 'ok') return toast.error(data.message || t('app.settingsTab.backup.resetError'));
                  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                  toast.success(t('app.settingsTab.backup.resetSuccess'));
                  window.location.reload();
                } catch {
                  toast.dismiss();
                  toast.error(t('app.settingsTab.backup.resetError'));
                } finally {
                  setResettingSystem(false);
                }
              }} className="w-full rounded-xl bg-red-500/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-500 transition-all hover:bg-red-500/20 disabled:opacity-60">
                {resettingSystem ? t('app.settingsTab.backup.resettingButton') : t('app.settingsTab.actions.resetSystem')}
              </button>
            </div>
          </div>
        </Card>

        <Card title={t('app.settingsTab.github.title')} subtitle={t('app.settingsTab.github.subtitle')} className="lg:col-span-2">
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <form onSubmit={async (e) => {
              e.preventDefault();
              await updateSettings([
                { key: 'github_repo_url', value: (e.currentTarget.elements.namedItem('github_repo_url') as HTMLInputElement)?.value || '', description: 'GitHub repository URL' },
                { key: 'github_branch', value: githubBranch, description: 'GitHub branch' },
                { key: 'auto_check_updates', value: (e.currentTarget.elements.namedItem('auto_check_updates') as HTMLInputElement)?.checked ? 'true' : 'false', description: 'Auto-check updates' },
              ]);
              toast.success(t('app.settingsTab.github.configSaved'));
            }} className="space-y-4 rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="flex items-center gap-2 text-primary"><GitBranch size={16} /><h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('app.settingsTab.github.source')}</h3></div>
              <div className="space-y-2">
                <label className={labelClass}>{t('app.settingsTab.labels.githubUrl')}</label>
                <input name="github_repo_url" type="url" defaultValue={getSetting('github_repo_url')} className={inputClass} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClass}>{t('app.settingsTab.labels.branch')}</label>
                  <input type="text" value={githubBranch} onChange={(event) => setGithubBranch(event.target.value)} className={inputClass} />
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.github.autoCheck')}</p>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">{t('app.settingsTab.github.autoCheckSubtitle')}</p>
                  </div>
                  <input type="checkbox" name="auto_check_updates" defaultChecked={getSetting('auto_check_updates') === 'true'} className="h-5 w-5 accent-primary" />
                </label>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={async () => {
                  try {
                    toast.loading(t('app.settingsTab.github.checking'));
                    const res = await fetch('/api/github/status', { credentials: 'include' });
                    const data = await res.json();
                    toast.dismiss();
                    if (data.status === 'ok') {
                      setGithubStatus(data);
                      toast.success(data.repoAvailable ? t('app.settingsTab.github.statusUpdated') : data.message);
                    } else {
                      toast.error(data.message || t('app.settingsTab.github.checkError'));
                    }
                  } catch {
                    toast.dismiss();
                    toast.error(t('app.settingsTab.github.checkError'));
                  }
                }} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition-all hover:border-primary/30 hover:bg-[var(--surface-3)]">
                  <RefreshCw size={14} className="mr-2 inline-block" />{t('app.settingsTab.actions.checkStatus')}
                </button>
                <button type="button" disabled={updatingGithub} onClick={async () => {
                  if (!githubBranch) return toast.error(t('app.settingsTab.github.defineBranch'));
                  if (!window.confirm(t('app.settingsTab.github.updateConfirm'))) return;
                  try {
                    setUpdatingGithub(true);
                    toast.loading(t('app.settingsTab.github.updating'));
                    const res = await fetch('/api/github/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: githubBranch }), credentials: 'include' });
                    const data = await res.json();
                    toast.dismiss();
                    if (data.status === 'ok') {
                      toast.success(`${t('app.settingsTab.github.updateSuccess')} (${data.beforeCommit} -> ${data.afterCommit})`);
                      setGithubStatus((current: any) => ({ ...current, branch: data.branch, commit: data.afterCommit, clean: true }));
                    } else {
                      toast.error(data.message || t('app.settingsTab.github.updateError'));
                    }
                  } catch {
                    toast.dismiss();
                    toast.error(t('app.settingsTab.github.updateError'));
                  } finally {
                    setUpdatingGithub(false);
                  }
                }} className="flex-1 rounded-xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50">
                  {updatingGithub ? t('app.settingsTab.github.updatingButton') : t('app.settingsTab.actions.updateNow')}
                </button>
              </div>
            </form>

            <div className="space-y-4 rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="flex items-center gap-2 text-primary"><Shield size={16} /><h3 className="text-xs font-black uppercase tracking-[0.2em]">{t('app.settingsTab.github.currentState')}</h3></div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.github.repository')}</p>
                <p className="mt-2 break-all text-sm font-bold text-[var(--text-main)]">{githubStatus?.remote || getSetting('github_repo_url', t('app.settingsTab.github.notConfigured'))}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.labels.branch')}</p>
                  <p className="mt-2 text-sm font-black text-[var(--text-main)]">{githubStatus?.branch || githubBranch || 'main'}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.github.commit')}</p>
                  <p className="mt-2 text-sm font-black text-[var(--text-main)]">{githubStatus?.commit || '—'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <div className="flex items-center gap-2">
                  {githubStatus?.repoAvailable ? (githubStatus.clean ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />) : <AlertTriangle size={16} className="text-amber-500" />}
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('app.settingsTab.github.status')}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--text-main)]">
                  {githubStatus?.repoAvailable ? (githubStatus.clean ? t('app.settingsTab.github.cleanRepo') : `${githubStatus.dirtyFiles || 0} ${t('app.settingsTab.github.localFilesChanged')}`) : githubStatus?.message || t('app.settingsTab.github.gitNotFound')}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
