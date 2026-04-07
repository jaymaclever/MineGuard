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

const panelClass =
  'rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3.5 shadow-[0_24px_60px_-44px_rgba(0,0,0,0.55)]';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]';
const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-primary';

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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            <Users size={12} />
            Estrutura da equipa
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)] md:text-[2rem]">Gestão de utilizadores</h2>
            <p className="max-w-2xl text-sm text-[var(--text-muted)]">Gira agentes, funções e perfis de acesso com uma vista mais clara para operação e administração.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className={panelClass}>
            <p className={labelClass}>Utilizadores</p>
            <p className="mt-1 text-xl font-black text-[var(--text-main)]">{users.length}</p>
          </div>
          <div className={panelClass}>
            <p className={labelClass}>Perfis ativos</p>
            <p className="mt-1 text-xl font-black text-[var(--text-main)]">{roleCount}</p>
          </div>
          <button
            onClick={onCreateUser}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground transition-all hover:brightness-110"
          >
            <Plus size={16} strokeWidth={3} />
            Adicionar agente
          </button>
        </div>
      </div>

      <Card title="Equipa operacional" subtitle="Pesquise rapidamente e atue sobre perfis existentes" className="rounded-[1.75rem]">
        <div className="mt-3 space-y-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome, função, número mecanográfico ou perfil..."
              className={inputClass + ' pl-10'}
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
              <Users className="text-[var(--text-faint)]" size={34} />
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-main)]">Nenhum utilizador encontrado</p>
                <p className="text-sm text-[var(--text-muted)]">Ajuste a pesquisa ou adicione um novo agente à estrutura operacional.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className="group rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-1)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-lg font-black text-primary">
                      {user.nome.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditUser(user)}
                        className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                        title="Editar utilizador"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteUser(user.id)}
                        className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Eliminar utilizador"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <h3 className="text-base font-black text-[var(--text-main)] transition-colors group-hover:text-primary">{user.nome}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{user.funcao}</p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Mecanográfico</span>
                      <span className="text-[11px] font-bold text-[var(--text-main)]">{user.numero_mecanografico}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Perfil</span>
                      <span className={cn('rounded-full bg-[var(--surface-3)] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]')}>
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
