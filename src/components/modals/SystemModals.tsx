import React from 'react';
import { motion } from 'motion/react';
import { XCircle } from 'lucide-react';
import { ALERT_AUDIENCE_OPTIONS } from '../../lib/alertAudience';

interface EditAlertModalProps {
  isOpen: boolean;
  form: { titulo: string; mensagem: string; tipo: string; expiresInHours: string; isTemporary: boolean; targetAudience: string; pinned: boolean };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

interface DashboardRangeModalProps {
  isOpen: boolean;
  value: { from: string; to: string };
  setValue: React.Dispatch<React.SetStateAction<{ from: string; to: string }>>;
  onClose: () => void;
  onApply: () => void;
}

interface UserModalProps {
  isOpen: boolean;
  editingUser: any | null;
  newUser: { nome: string; funcao: string; numero_mecanografico: string; nivel_hierarquico: string; password: string };
  setNewUser: React.Dispatch<React.SetStateAction<any>>;
  roles: Array<{ nivel_hierarquico: string; peso: number }>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const shellClass =
  'w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-main)] shadow-2xl';
const headerClass =
  'flex items-center justify-between border-b border-[var(--border)] bg-white/[0.03] p-6';
const inputClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-main)] focus:border-primary focus:outline-none';
const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]';
const cancelClass =
  'px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]';

export const EditAlertModal: React.FC<EditAlertModalProps> = ({ isOpen, form, setForm, onClose, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`${shellClass} max-w-3xl`}>
        <div className={headerClass}>
          <h3 className="text-xl font-black uppercase tracking-tighter">Editar alerta</h3>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className={labelClass}>Título</label>
            <input type="text" required value={form.titulo} onChange={(event) => setForm((current: any) => ({ ...current, titulo: event.target.value }))} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Mensagem</label>
            <textarea required value={form.mensagem} onChange={(event) => setForm((current: any) => ({ ...current, mensagem: event.target.value }))} className={`min-h-[80px] resize-none ${inputClass}`} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(event) =>
                  setForm((current: any) => ({
                    ...current,
                    tipo: event.target.value,
                    pinned: event.target.value === 'critico' ? true : current.pinned,
                    expiresInHours: event.target.value === 'critico' ? '72' : current.expiresInHours,
                  }))
                }
                className={inputClass}
              >
                <option value="aviso">Aviso</option>
                <option value="critico">Crítico</option>
                <option value="informativo">Informativo</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Validade</label>
              <select value={form.expiresInHours} onChange={(event) => setForm((current: any) => ({ ...current, expiresInHours: event.target.value, isTemporary: event.target.value !== '0' }))} className={inputClass}>
                <option value="1">1 hora</option>
                <option value="6">6 horas</option>
                <option value="24">24 horas</option>
                <option value="72">72 horas</option>
                <option value="0">Permanente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Público-alvo</label>
              <select
                value={form.targetAudience}
                onChange={(event) => setForm((current: any) => ({ ...current, targetAudience: event.target.value }))}
                className={inputClass}
              >
                {ALERT_AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Fixar no topo</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Os alertas críticos ficam fixados automaticamente.</p>
              </div>
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm((current: any) => ({ ...current, pinned: event.target.checked }))}
                className="h-5 w-5 accent-primary"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 rounded-lg border border-[var(--border)] ${cancelClass}`}>
              Cancelar
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
              Guardar alterações
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export const DashboardRangeModal: React.FC<DashboardRangeModalProps> = ({ isOpen, value, setValue, onClose, onApply }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`${shellClass} max-w-xl`}>
        <div className={headerClass}>
          <h3 className="text-xl font-black uppercase tracking-tighter">Intervalo personalizado</h3>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]">
            <XCircle size={24} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>De</label>
              <input type="date" value={value.from} onChange={(event) => setValue((current) => ({ ...current, from: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Até</label>
              <input type="date" value={value.to} onChange={(event) => setValue((current) => ({ ...current, to: event.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 rounded-lg border border-[var(--border)] ${cancelClass}`}>
              Cancelar
            </button>
            <button type="button" onClick={onApply} className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
              Aplicar intervalo
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const UserModal: React.FC<UserModalProps> = ({ isOpen, editingUser, newUser, setNewUser, roles, onClose, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`${shellClass} max-w-2xl`}>
        <div className={headerClass}>
          <h3 className="text-xl font-black uppercase tracking-tighter">{editingUser ? 'Editar utilizador' : 'Novo utilizador'}</h3>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nome</label>
              <input type="text" required value={newUser.nome} onChange={(event) => setNewUser((current: any) => ({ ...current, nome: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Função</label>
              <input type="text" required value={newUser.funcao} onChange={(event) => setNewUser((current: any) => ({ ...current, funcao: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Número mecanográfico</label>
              <input type="text" required value={newUser.numero_mecanografico} onChange={(event) => setNewUser((current: any) => ({ ...current, numero_mecanografico: event.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nível hierárquico</label>
              <select value={newUser.nivel_hierarquico} onChange={(event) => setNewUser((current: any) => ({ ...current, nivel_hierarquico: event.target.value }))} className={inputClass}>
                {roles.map((role) => (
                  <option key={role.nivel_hierarquico} value={role.nivel_hierarquico}>{role.nivel_hierarquico}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>{editingUser ? 'Nova senha (opcional)' : 'Senha'}</label>
            <input type="password" required={!editingUser} value={newUser.password} onChange={(event) => setNewUser((current: any) => ({ ...current, password: event.target.value }))} className={inputClass} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 rounded-lg border border-[var(--border)] ${cancelClass}`}>
              Cancelar
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
