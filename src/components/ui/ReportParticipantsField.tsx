import React, { useMemo, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { User } from '../../types';

interface ReportParticipantsFieldProps {
  availableUsers: User[];
  selectedUserIds: number[];
  onChange: (nextUserIds: number[]) => void;
  currentUserId?: number;
  label?: string;
  hint?: string;
}

export const ReportParticipantsField: React.FC<ReportParticipantsFieldProps> = ({
  availableUsers,
  selectedUserIds,
  onChange,
  currentUserId,
  label = 'Agentes participantes',
  hint = 'Adicione agentes que participaram na ocorrência e que também poderão editar este registo.',
}) => {
  const [query, setQuery] = useState('');

  const selectedUsers = useMemo(
    () => availableUsers.filter((user) => selectedUserIds.includes(user.id)),
    [availableUsers, selectedUserIds],
  );

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return availableUsers
      .filter((user) => user.id !== currentUserId && !selectedUserIds.includes(user.id))
      .filter((user) => {
        if (!normalizedQuery) return true;
        return [user.nome, user.numero_mecanografico, user.funcao, user.nivel_hierarquico]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .slice(0, 8);
  }, [availableUsers, currentUserId, query, selectedUserIds]);

  const addUser = (userId: number) => {
    onChange([...selectedUserIds, userId]);
    setQuery('');
  };

  const removeUser = (userId: number) => {
    onChange(selectedUserIds.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</label>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por nome, número mecanográfico ou função..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-primary focus:outline-none"
          />
        </div>

        {selectedUsers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary"
              >
                <span>{user.nome}</span>
                <span className="text-primary/70">• {user.numero_mecanografico}</span>
                <button type="button" onClick={() => removeUser(user.id)} className="text-primary/70 transition-colors hover:text-primary">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-2">
          {suggestions.length > 0 ? (
            suggestions.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => addUser(user.id)}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-zinc-900"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-100">{user.nome}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    {user.numero_mecanografico} • {user.nivel_hierarquico} • {user.funcao}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                  <UserPlus size={13} />
                  Adicionar
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-4 text-xs text-zinc-500">
              {query.trim() ? 'Nenhum utilizador corresponde à pesquisa.' : 'Sem mais utilizadores disponíveis para adicionar.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
