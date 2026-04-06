import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Edit2, Plus, Search, Trash2, Users } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { User } from '../../types';
import { cn } from '../../lib/utils';

interface UsersTabProps {
  users: User[];
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: number) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({ users, onCreateUser, onEditUser, onDeleteUser }) => {
  const [query, setQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.nome, user.funcao, user.numero_mecanografico, user.nivel_hierarquico].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [users, query]);

  const roleCount = useMemo(() => new Set(users.map((user) => user.nivel_hierarquico)).size, [users]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            <Users size={12} />
            Estrutura da equipa
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Gestão de utilizadores</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">Gira agentes, funções e perfis de acesso com uma vista mais clara para operação e administração.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Utilizadores</p>
            <p className="mt-1 text-2xl font-black text-white">{users.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Perfis ativos</p>
            <p className="mt-1 text-2xl font-black text-white">{roleCount}</p>
          </div>
          <button onClick={onCreateUser} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black transition-all hover:bg-white">
            <Plus size={16} strokeWidth={3} />
            Adicionar agente
          </button>
        </div>
      </div>

      <Card title="Equipa operacional" subtitle="Pesquise rapidamente e atue sobre perfis existentes" className="rounded-[1.75rem]">
        <div className="mt-4 space-y-5">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome, função, número mecanográfico ou perfil..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-zinc-100 focus:border-primary focus:outline-none"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-8 text-center">
              <Users className="text-zinc-600" size={34} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-300">Nenhum utilizador encontrado</p>
                <p className="mt-2 text-sm text-zinc-500">Ajuste a pesquisa ou adicione um novo agente à estrutura operacional.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="group rounded-[1.5rem] border border-zinc-800/70 transition-all hover:border-zinc-700 hover:bg-zinc-900/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-lg font-black text-primary shadow-inner">
                      {user.nome.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEditUser(user)} className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-blue-500/10 hover:text-blue-400">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => onDeleteUser(user.id)} className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-base font-black text-zinc-100 transition-colors group-hover:text-primary">{user.nome}</h3>
                    <p className="mt-1 text-sm text-zinc-500">{user.funcao}</p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mecanográfico</span>
                      <span className="text-[11px] font-bold text-zinc-200">{user.numero_mecanografico}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Perfil</span>
                      <span className={cn('rounded-full bg-zinc-800 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300')}>
                        {user.nivel_hierarquico}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
