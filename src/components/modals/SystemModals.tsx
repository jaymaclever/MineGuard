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

export const EditAlertModal: React.FC<EditAlertModalProps> = ({ isOpen, form, setForm, onClose, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <div key="edit-alert-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <h3 className="text-xl font-black uppercase tracking-tighter">Editar alerta</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 transition-colors hover:text-white">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Título</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(event) => setForm((current: any) => ({ ...current, titulo: event.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Mensagem</label>
            <textarea
              required
              value={form.mensagem}
              onChange={(event) => setForm((current: any) => ({ ...current, mensagem: event.target.value }))}
              className="min-h-[80px] w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo</label>
            <select
              value={form.tipo}
              onChange={(event) => setForm((current: any) => ({ ...current, tipo: event.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="aviso">Aviso</option>
              <option value="critico">Crítico</option>
              <option value="informativo">Informativo</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-800 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
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
    <div key="dashboard-range-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md no-print">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/20 p-6">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Intervalo da dashboard</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Defina o período da análise</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-white">
            <XCircle size={22} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">De</label>
            <input
              type="date"
              value={value.from}
              onChange={(event) => setValue((current) => ({ ...current, from: event.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Até</label>
            <input
              type="date"
              value={value.to}
              onChange={(event) => setValue((current) => ({ ...current, to: event.target.value }))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900/20 p-6">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
            Cancelar
          </button>
          <button type="button" onClick={onApply} className="rounded-lg bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
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
    <div key="new-user-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl"
      >
        <form onSubmit={onSubmit}>
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/20 p-6">
            <h3 className="text-xl font-black uppercase tracking-tighter">{editingUser ? 'Editar agente' : 'Novo agente'}</h3>
            <button type="button" onClick={onClose} className="text-zinc-500 transition-colors hover:text-white">
              <XCircle size={24} />
            </button>
          </div>
          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nome completo</label>
              <input
                required
                type="text"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                placeholder="Ex: Carlos Oliveira"
                value={newUser.nome}
                onChange={(event) => setNewUser((current: any) => ({ ...current, nome: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Função operacional</label>
                <input
                  required
                  type="text"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  placeholder="Ex: Monitor de Perímetro"
                  value={newUser.funcao}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, funcao: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nº mecanográfico</label>
                <input
                  required
                  type="text"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={newUser.numero_mecanografico}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, numero_mecanografico: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nível hierárquico</label>
                <select
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
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
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Idioma preferido</label>
                <select
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={normalizeLanguage((newUser as any).preferred_language || 'pt')}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, preferred_language: event.target.value }))}
                >
                  <option value="pt">Português</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Senha de acesso</label>
                <input
                  type="password"
                  required={!editingUser}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  value={newUser.password}
                  onChange={(event) => setNewUser((current: any) => ({ ...current, password: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900/20 p-6">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-zinc-100 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-white/10 transition-all hover:bg-white">
              Guardar agente
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
