import React from 'react';
import { motion } from 'motion/react';
import { XCircle } from 'lucide-react';
import { NivelHierarquico } from '../../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  setUser: (user: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  roles: { nivel_hierarquico: string, peso: number }[];
  isEditing: boolean;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  user,
  setUser,
  onSubmit,
  roles,
  isEditing
}) => {
  if (!isOpen) return null;

  return (
    <div key="user-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <form onSubmit={onSubmit}>
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
            <h3 className="text-xl font-black tracking-tighter uppercase">{isEditing ? 'Editar Agente' : 'Novo Agente'}</h3>
            <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <XCircle size={24} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome Completo</label>
              <input 
                required
                type="text" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                placeholder="Ex: Carlos Oliveira"
                value={user.nome}
                onChange={(e) => setUser({...user, nome: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Função Operacional</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  placeholder="Ex: Monitor de Perímetro"
                  value={user.funcao}
                  onChange={(e) => setUser({...user, funcao: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nº Mecanográfico</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  placeholder="Ex: M-5022"
                  value={user.numero_mecanografico}
                  onChange={(e) => setUser({...user, numero_mecanografico: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nível Hierárquico</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  value={user.nivel_hierarquico}
                  onChange={(e) => setUser({...user, nivel_hierarquico: e.target.value as NivelHierarquico})}
                >
                  {roles.map(r => (
                    <option key={r.nivel_hierarquico} value={r.nivel_hierarquico}>{r.nivel_hierarquico}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Idioma Preferido</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  value={user.preferred_language || 'pt-BR'}
                  onChange={(e) => setUser({...user, preferred_language: e.target.value})}
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Senha de Acesso</label>
                <input 
                  type="password" 
                  required={!isEditing}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  placeholder={isEditing ? "Deixe em branco para manter" : "Senha inicial"}
                  value={user.password}
                  onChange={(e) => setUser({...user, password: e.target.value})}
                />
              </div>
            </div>
          </div>
          <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" className="bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-white/10">Salvar Agente</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
