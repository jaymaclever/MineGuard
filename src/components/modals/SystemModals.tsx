import React from 'react';
import { motion } from 'motion/react';
import { XCircle } from 'lucide-react';
import { normalizeLanguage } from '../../i18n';

interface EditAlertModalProps {
  isOpen: boolean;
  form: { titulo: string; mensagem: string; tipo: string };
  setForm: React.Dispatch<React.SetStateAction<any>>;
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
    <div key="edit-alert-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`${shellClass} max-w-3xl`}
      >
        <div className={headerClass}>
          <h3 className="text-xl font-black uppercase tracking-tighter">Editar alerta</h3>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className={labelClass}>Título</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(event) => setForm((current: any) => ({ ...current, titulo: event.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Mensagem</label>
            <textarea
              required
              value={form.mensagem}
              onChange={(event) => setForm((current: any) => ({ ...current, mensagem: event.target.value }))}
              className={`min-h-[80px] resize-none ${inputClass}`}
            />
          </div>

          <div>
            <label className={labelClass}>Tipo</label>
            <select
              value={form.tipo}
              onChange={(event) => setForm((current: any) => ({ ...current, tipo: event.target.value }))}
              className={inputClass}
            >
              <option value="aviso">Aviso</option>
              <option value="critico">Crítico</option>
              <option value="informativo">Informativo</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 rounded-lg border border-[var(--border)] ${cancelClass}`}>
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
            >
              Guardar alterações
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface DashboardRangeModalProps {
  isOpen: boolean;
  value: { from: string; to: string };
  setValue: React.Dispatch<React.SetStateAction<{ from: string; to: string }>>;
  onClose: () => void;
  onApply: () => void;
}

export const DashboardRangeModal: React.FC<DashboardRangeModalProps> = ({ isOpen, value, setValue, onClose, onApply }) => {
  if (!isOpen) return null;

  return (
    <div key="dashboard-range-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-md no-print">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className={`${shellClass} max-w-md`}
      >
        <div className={headerClass}>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Intervalo da dashboard</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Defina o período da análise</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]">
            <XCircle size={22} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <label className={labelClass}>De</label>
            <input
              type="date"
              value={value.from}
              onChange={(event) => setValue((current) => ({ ...current, from: event.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Até</label>
            <input
              type="date"
              value={value.to}
              onChange={(event) => setValue((current) => ({ ...current, to: event.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-white/[0.03] p-6">
          <button type="button" onClick={onClose} className={cancelClass}>
            Cancelar
          </button>
          <button type="button" onClick={onApply} className="rounded-lg bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
            Aplicar intervalo
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface UserModalProps {
  isOpen: boolean;
  editingUser: any;
  newUser: any;
  setNewUser: React.Dispatch<React.SetStateAction<any>>;
  roles: Array<{ nivel_hierarquico: string }>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, editingUser, newUser, setNewUser, roles, onClose, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <div key="new-user-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg-overlay)] p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`${shellClass} max-w-lg`}
      >
        <form onSubmit={onSubmit}>
          <div className={headerClass}>
            <h3 className="text-xl font-black uppercase tracking-tighter">{editingUser ? 'Editar agente' : 'Novo agente'}</h3>
            <button type="button" onClick={onClose} className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]">
              <XCircle size={24} />
            </button>
          </div>
          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <label className={labelClass}>Nome completo</label>
              <input
                required
                type="text"
                className={inputClass}
                placeholder="Ex: Carlos Oliveira"
                value={newUser.nome}
                onChange={(event) => setNewUser((current: any) => ({ ...current, nome: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClass}>Função operacional</label>
                <input
                  required
                  type="text"
                  className={inputClass}
                  placeholder="Ex: Monitor de Perímetro"
                  value={newUser.funcao}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, funcao: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Nº mecanográfico</label>
                <input
                  required
                  type="text"
                  className={inputClass}
                  value={newUser.numero_mecanografico}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, numero_mecanografico: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className={labelClass}>Nível hierárquico</label>
                <select
                  className={inputClass}
                  value={newUser.nivel_hierarquico}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, nivel_hierarquico: event.target.value }))}
                >
                  {roles.map((role) => (
                    <option key={role.nivel_hierarquico} value={role.nivel_hierarquico}>
                      {role.nivel_hierarquico}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Idioma preferido</label>
                <select
                  className={inputClass}
                  value={normalizeLanguage((newUser as any).preferred_language || 'pt')}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, preferred_language: event.target.value }))}
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Senha de acesso</label>
                <input
                  type="password"
                  required={!editingUser}
                  className={inputClass}
                  value={newUser.password}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, password: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-white/[0.03] p-6">
            <button type="button" onClick={onClose} className={cancelClass}>
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
              Guardar agente
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
