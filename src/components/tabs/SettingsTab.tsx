import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Clock, 
  ChevronRight, 
  Download, 
  Shield 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Card, LanguageSwitcher } from '../ui/LayoutComponents';
import { User } from '../../types';

interface SettingsTabProps {
  systemSettings: any[];
  publicSettings: any;
  updateSettings: (settings: any[]) => Promise<boolean>;
  currentUser: User;
  fetchData?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  systemSettings, 
  publicSettings, 
  updateSettings, 
  currentUser,
  fetchData
}) => {
  const getSetting = (key: string) => systemSettings.find(s => s.key === key)?.value || '';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Configurações do Sistema</h2>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Integrações e parâmetros globais de segurança</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="🔔 Notificações" subtitle="Configure email, Telegram e relatórios agendados" className="lg:col-span-2">
          <div className="space-y-6">
            {/* Email SMTP section */}
            <div className="border-b border-zinc-800 pb-6">
              <h3 className="text-[10px] font-black text-zinc-200 mb-4 uppercase tracking-widest">📧 Email SMTP</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await updateSettings([
                  { key: 'email_sender', value: formData.get('email_sender'), description: 'Email do remetente' },
                  { key: 'email_sender_name', value: formData.get('email_sender_name'), description: 'Nome do remetente' },
                  { key: 'smtp_host', value: formData.get('smtp_host'), description: 'Host SMTP' },
                  { key: 'smtp_port', value: formData.get('smtp_port'), description: 'Porta SMTP' },
                  { key: 'smtp_user', value: formData.get('smtp_user'), description: 'Usuário SMTP' },
                  { key: 'smtp_password', value: formData.get('smtp_password'), description: 'Senha SMTP' }
                ]);
              }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase">Remetente</label>
                    <input name="email_sender" type="email" defaultValue={getSetting('email_sender')} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-xs focus:outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase">Nome</label>
                    <input name="email_sender_name" defaultValue={getSetting('email_sender_name') || 'MineGuard'} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-xs focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase">Host SMTP</label>
                    <input name="smtp_host" defaultValue={getSetting('smtp_host')} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-xs focus:outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase">Porta</label>
                    <input name="smtp_port" type="number" defaultValue={getSetting('smtp_port') || '587'} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-xs focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[9px] font-black uppercase transition-all tracking-widest">Salvar Email</button>
              </form>
            </div>

            {/* Telegram Section */}
            <div className="border-b border-zinc-800 pb-6">
              <h3 className="text-[10px] font-black text-zinc-200 mb-4 uppercase tracking-widest">📱 Telegram</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await updateSettings([
                  { key: 'telegram_bot_token', value: formData.get('telegram_bot_token'), description: 'Token do Bot' },
                  { key: 'telegram_chat_id', value: formData.get('telegram_chat_id'), description: 'Chat ID' }
                ]);
              }} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase">Bot Token</label>
                  <input name="telegram_bot_token" type="password" defaultValue={getSetting('telegram_bot_token')} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-xs focus:outline-none focus:border-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase">Chat ID</label>
                  <input name="telegram_chat_id" type="text" defaultValue={getSetting('telegram_chat_id')} className="w-full bg-zinc-800 border border-zinc-700 rounded py-2 px-3 text-xs focus:outline-none focus:border-primary" />
                </div>
                <button type="submit" className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[9px] font-black uppercase transition-all tracking-widest">Salvar Telegram</button>
              </form>
            </div>
          </div>
        </Card>

        <Card title="Personalização da UI" subtitle="Altere a aparência global do sistema" className="lg:col-span-2">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const success = await updateSettings([
              { key: 'app_name', value: formData.get('app_name'), description: 'Nome da Aplicação' },
              { key: 'app_slogan', value: formData.get('app_slogan'), description: 'Slogan da Aplicação' },
              { key: 'app_theme_mode', value: formData.get('app_theme_mode'), description: 'Modo do Tema' },
              { key: 'app_theme_palette', value: formData.get('app_theme_palette'), description: 'Paleta de Cores' }
            ]);
            if (success) {
              toast.info("Recarregando identidade visual...");
              setTimeout(() => window.location.reload(), 1000);
            }
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase">Nome do App</label>
                <input name="app_name" defaultValue={publicSettings.app_name} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase">Slogan</label>
                <input name="app_slogan" defaultValue={publicSettings.app_slogan} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-8 py-2.5 bg-primary hover:opacity-90 text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Aplicar Identidade</button>
            </div>
          </form>
        </Card>

        <Card title="Preferências de Idioma" subtitle="Selecione o idioma da interface">
          <LanguageSwitcher />
        </Card>

        <Card title="Backup & Restauração" subtitle="Gerencie backups do banco de dados">
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
                  toast.success("Backup baixado com sucesso!");
                }
              }}
              className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
            >
              ⬇️ Baixar Backup Agora
            </button>
            <p className="text-[9px] text-zinc-500 text-center uppercase font-bold tracking-widest">Recomendamos backups semanais</p>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
