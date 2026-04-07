import React from 'react';
import { motion } from 'motion/react';
import { BellRing, Download, Globe, LayoutTemplate, Mail, Palette, Radar, Shield, Sparkles } from 'lucide-react';
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

const panelClass =
  'rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-[0_24px_60px_-44px_rgba(0,0,0,0.75)]';
const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-primary';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]';

export const SettingsTab: React.FC<SettingsTabProps> = ({ systemSettings, publicSettings, updateSettings }) => {
  const getSetting = (key: string, fallback = '') => systemSettings.find((setting) => setting.key === key)?.value || fallback;

  const themeMode = publicSettings.app_theme_mode === 'light' ? 'light' : 'dark';
  const palettes = themePalettes.filter((palette) => palette.mode === themeMode);
  const selectedPalette = palettes.find((palette) => palette.id === resolveThemePalette(themeMode, publicSettings.app_theme_palette)) || palettes[0];
  const selectedTemplate = themeTemplates.find((template) => template.id === resolveThemeTemplate(publicSettings.app_theme_template)) || themeTemplates[0];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight uppercase text-[var(--text-main)]">Configurações do Sistema</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Integrações, identidade visual, cópias de segurança e parâmetros globais do produto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card title="Notificações" subtitle="Configure email, Telegram e relatórios agendados" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await updateSettings([
                  { key: 'email_sender', value: formData.get('email_sender'), description: 'Email do remetente' },
                  { key: 'email_sender_name', value: formData.get('email_sender_name'), description: 'Nome do remetente' },
                  { key: 'smtp_host', value: formData.get('smtp_host'), description: 'Host SMTP' },
                  { key: 'smtp_port', value: formData.get('smtp_port'), description: 'Porta SMTP' },
                  { key: 'smtp_user', value: formData.get('smtp_user'), description: 'Utilizador SMTP' },
                  { key: 'smtp_password', value: formData.get('smtp_password'), description: 'Senha SMTP' },
                ]);
              }}
              className={panelClass}
            >
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Mail size={16} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Email SMTP</h3>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className={labelClass}>Remetente</label>
                    <input name="email_sender" type="email" defaultValue={getSetting('email_sender')} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Nome</label>
                    <input name="email_sender_name" defaultValue={getSetting('email_sender_name', 'MineGuard')} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Host SMTP</label>
                    <input name="smtp_host" defaultValue={getSetting('smtp_host')} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Porta</label>
                    <input name="smtp_port" type="number" defaultValue={getSetting('smtp_port', '587')} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Utilizador</label>
                    <input name="smtp_user" defaultValue={getSetting('smtp_user')} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Senha</label>
                    <input name="smtp_password" type="password" defaultValue={getSetting('smtp_password')} className={inputClass} />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-xl bg-primary/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/20">
                  Guardar Email
                </button>
              </div>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await updateSettings([
                  { key: 'telegram_bot_token', value: formData.get('telegram_bot_token'), description: 'Token do Bot' },
                  { key: 'telegram_chat_id', value: formData.get('telegram_chat_id'), description: 'Chat ID' },
                  { key: 'telegram_alert_level', value: formData.get('telegram_alert_level'), description: 'Nível de alerta' },
                ]);
              }}
              className={panelClass}
            >
              <div className="mb-4 flex items-center gap-2 text-primary">
                <BellRing size={16} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Telegram</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className={labelClass}>Bot Token</label>
                  <input name="telegram_bot_token" type="password" defaultValue={getSetting('telegram_bot_token')} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Chat ID</label>
                  <input name="telegram_chat_id" type="text" defaultValue={getSetting('telegram_chat_id')} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Nível mínimo</label>
                  <select name="telegram_alert_level" defaultValue={getSetting('telegram_alert_level', 'G3')} className={inputClass}>
                    <option value="G4">G4 (Crítico)</option>
                    <option value="G3">G3 e G4</option>
                    <option value="G2">G2, G3 e G4</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const token = (document.getElementsByName('telegram_bot_token')[0] as HTMLInputElement)?.value;
                      const id = (document.getElementsByName('telegram_chat_id')[0] as HTMLInputElement)?.value;
                      if (!token || !id) return toast.error('Preencha os campos.');
                      toast.loading('A testar Telegram...');
                      const res = await fetch('/api/test-telegram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ botToken: token, chatId: id }),
                        credentials: 'include',
                      });
                      const data = await res.json();
                      toast.dismiss();
                      if (data.status === 'ok') toast.success('Telegram configurado com sucesso.');
                      else toast.error('Falha: ' + data.message);
                    }}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)]"
                  >
                    Testar
                  </button>
                  <button type="submit" className="rounded-xl bg-primary/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/20">
                    Guardar
                  </button>
                </div>
              </div>
            </form>

            <div className={panelClass}>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Radar size={16} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Relatórios Agendados</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-main)]">Geração automática</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Relatório diário às 06:00.</p>
                  </div>
                  <div className="h-5 w-10 rounded-full bg-primary/30">
                    <div className="ml-auto h-3 w-3 translate-x-4 rounded-full bg-primary" />
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="text-sm font-bold text-[var(--text-main)]">Retenção de dados</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Manter logs por 90 dias.</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Canais e conteúdo</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Mantido via parametrização existente no sistema.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Personalização da interface" subtitle="Altere a aparência global do sistema" className="lg:col-span-2">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const settings = [
                { key: 'app_name', value: formData.get('app_name'), description: 'Nome da aplicação' },
                { key: 'app_slogan', value: formData.get('app_slogan'), description: 'Slogan da aplicação' },
                { key: 'app_theme_mode', value: formData.get('app_theme_mode'), description: 'Modo do tema' },
                { key: 'app_theme_palette', value: formData.get('app_theme_palette'), description: 'Paleta de cores' },
                { key: 'app_theme_template', value: formData.get('app_theme_template'), description: 'Template visual' },
                { key: 'app_layout', value: formData.get('app_layout'), description: 'Layout do sistema' },
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
                <label className={labelClass}>Nome da aplicação</label>
                <input name="app_name" defaultValue={publicSettings.app_name} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Slogan da aplicação</label>
                <input name="app_slogan" defaultValue={publicSettings.app_slogan} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_220px_1fr]">
              <div className="space-y-2">
                <label className={labelClass}>Modo do tema</label>
                <select name="app_theme_mode" defaultValue={publicSettings.app_theme_mode} className={inputClass}>
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Template visual</label>
                <select name="app_theme_template" defaultValue={publicSettings.app_theme_template || 'executive'} className={inputClass}>
                  {themeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Layout do sistema</label>
                <select name="app_layout" defaultValue={publicSettings.app_layout} className={inputClass}>
                  <option value="default">Padrão (barra lateral)</option>
                  <option value="compact">Compacto</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Paletas para {themeMode === 'light' ? 'modo claro' : 'modo escuro'}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Escolha uma paleta com contraste e personalidade próprios.</p>
                </div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {palettes.length} opções
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {palettes.map((palette) => (
                  <label
                    key={palette.id}
                    className={cn(
                      'cursor-pointer rounded-[1.4rem] border p-4 transition-all',
                      publicSettings.app_theme_palette === palette.id
                        ? 'border-primary bg-primary/8'
                        : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <input type="radio" name="app_theme_palette" value={palette.id} defaultChecked={publicSettings.app_theme_palette === palette.id} className="sr-only" />
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
                <Sparkles size={15} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]">Preview</h3>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
                <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Identidade</p>
                  <p className="mt-2 text-sm font-black text-[var(--text-main)]">{publicSettings.app_name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{publicSettings.app_slogan}</p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Painel</p>
                      <h4 className="mt-1 text-base font-black text-[var(--text-main)]">{selectedTemplate.name}</h4>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                      style={{ backgroundColor: `${selectedPalette?.accent}16`, color: selectedPalette?.accent }}
                    >
                      {selectedPalette?.name}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[1, 2, 3].map((value) => (
                      <div key={value} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Indicador</p>
                        <p className="mt-3 text-2xl font-black text-[var(--text-main)]">{value * 12}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="rounded-xl bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90">
                Aplicar identidade
              </button>
            </div>
          </form>
        </Card>

        <Card title="Preferências de idioma" subtitle="Mantém o idioma do perfil do utilizador">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Globe size={12} />
              Idioma controlado no perfil
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              O idioma da interface é definido pelo perfil do utilizador para evitar conflitos entre definições globais e preferência individual.
            </p>
          </div>
        </Card>

        <Card title="Backup e restauração" subtitle="Gerencie backups do banco de dados">
          <div className="space-y-4">
            <button
              onClick={async () => {
                const res = await fetch('/api/backup', { credentials: 'include' });
                if (res.ok) {
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `mineguard-backup-${new Date().toISOString().split('T')[0]}.db`;
                  a.click();
                  toast.success('Cópia de segurança descarregada com sucesso!');
                }
              }}
              className="w-full rounded-xl bg-[var(--surface-2)] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-main)] transition-all hover:bg-[var(--surface-3)]"
            >
              <Download size={14} className="mr-2 inline-block" />
              Descarregar backup agora
            </button>
            <p className="text-center text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Recomendamos cópias semanais</p>
          </div>
        </Card>

        <Card title="Segurança e identidade" subtitle="Resumo do modo e da paleta ativos">
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <Shield size={16} className="text-primary" />
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">Modo {themeMode === 'light' ? 'claro' : 'escuro'}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Template {selectedTemplate.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <Palette size={16} className="text-primary" />
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">{selectedPalette?.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{selectedPalette?.description}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
