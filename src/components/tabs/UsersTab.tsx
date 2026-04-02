import React from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { User } from '../../types';

interface UsersTabProps {
  users: User[];
  roles: any[];
  setEditingUser: (user: User | null) => void;
  setNewUser: (user: any) => void;
  setIsNewUserModalOpen: (open: boolean) => void;
  deleteUser: (id: number) => void;
  isLoading: boolean;
}

export const UsersTab: React.FC<UsersTabProps> = ({ 
  users, 
  roles, 
  setEditingUser, 
  setNewUser, 
  setIsNewUserModalOpen, 
  deleteUser,
  isLoading
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Gestão de Pessoal</h2>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Administração de agentes e níveis de acesso</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser(null);
            setNewUser({ nome: '', funcao: '', numero_mecanografico: '', nivel_hierarquico: 'Agente' });
            setIsNewUserModalOpen(true);
          }}
          className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-5 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-white/10"
        >
          <Plus size={16} strokeWidth={3} />
          Adicionar Agente
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center uppercase font-black text-zinc-500 tracking-[0.3em] text-xs">
          Carregando pessoal...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <Card key={user.id} className="group hover:border-zinc-700 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-primary text-lg shadow-inner">
                  {user.nome.charAt(0)}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setEditingUser(user);
                      setNewUser({ 
                        nome: user.nome, 
                        funcao: user.funcao, 
                        numero_mecanografico: user.numero_mecanografico, 
                        nivel_hierarquico: user.nivel_hierarquico 
                      });
                      setIsNewUserModalOpen(true);
                    }}
                    className="p-2 text-zinc-600 hover:text-blue-400 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => deleteUser(user.id)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-black text-zinc-100 group-hover:text-primary transition-colors uppercase tracking-tight">{user.nome}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{user.funcao}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                <span className="text-[9px] font-black text-zinc-600 tracking-widest uppercase">{user.numero_mecanografico}</span>
                <span className="text-[8px] font-black px-2 py-1 rounded bg-zinc-800 text-zinc-400 uppercase tracking-widest border border-zinc-700/50">
                  {user.nivel_hierarquico}
                </span>
              </div>
            </Card>
          ))}
          {users.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-20">
              <Plus size={48} className="mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum agente registrado</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
