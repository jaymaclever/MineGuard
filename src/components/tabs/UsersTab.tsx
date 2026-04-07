import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Edit2, FileSpreadsheet, Plus, Search, ShieldCheck, Trash2, Upload, Users } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { User } from '../../types';
import { cn } from '../../lib/utils';

interface UsersTabProps {
  users: User[];
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: number) => void;
  onImportUsers: (file: File) => void;
  isImportingUsers?: boolean;
}

const panelClass =
  'rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3.5 shadow-[0_24px_60px_-44px_rgba(0,0,0,0.55)]';
const labelClass = 'text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]';
const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-primary';

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  onCreateUser,
  onEditUser,
  onDeleteUser,
  onImportUsers,
  isImportingUsers = false,
}) => {
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.nome, user.funcao, user.numero_mecanografico, user.nivel_hierarquico, user.preferred_language]
        .some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [users, query]);

  const roleCount = useMemo(() => new Set(users.map((user) => user.nivel_hierarquico)).size, [users]);
  const supervisoryCount = useMemo(
    () => users.filter((user) => ['Superadmin', 'Sierra 1', 'Sierra 2', 'Oficial'].includes(user.nivel_hierarquico)).length,
    [users]
  );
  const ptCount = useMemo(() => users.filter((user) => (user.preferred_language || 'pt').startsWith('pt')).length, [users]);

  const handleSpreadsheetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportUsers(file);
    event.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            <Users size={12} />
            Estrutura da equipa
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)] md:text-[2rem]">Gestão de utilizadores</h2>
            <p className="max-w-3xl text-sm text-[var(--text-muted)]">
              Gira a equipa, cria perfis individuais e importa múltiplos agentes por planilha Excel com validação automática de duplicados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <div className={panelClass}>
            <p className={labelClass}>Utilizadores</p>
            <p className="mt-1 text-xl font-black text-[var(--text-main)]">{users.length}</p>
          </div>
          <div className={panelClass}>
            <p className={labelClass}>Perfis ativos</p>
            <p className="mt-1 text-xl font-black text-[var(--text-main)]">{roleCount}</p>
          </div>
          <div className={panelClass}>
            <p className={labelClass}>Níveis de chefia</p>
            <p className="mt-1 text-xl font-black text-[var(--text-main)]">{supervisoryCount}</p>
          </div>
          <div className={panelClass}>
            <p className={labelClass}>Perfil PT</p>
            <p className="mt-1 text-xl font-black text-[var(--text-main)]">{ptCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(24rem,0.95fr)]">
        <Card title="Equipa operacional" subtitle="Pesquisa rápida, gestão individual e acesso direto ao cadastro" className="rounded-[1.75rem]">
          <div className="mt-3 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar por nome, função, número mecanográfico, idioma ou perfil..."
                  className={inputClass + ' pl-10'}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onCreateUser}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground transition-all hover:brightness-110"
                >
                  <Plus size={16} strokeWidth={3} />
                  Adicionar agente
                </button>
              </div>
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
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
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

                    <div className="mt-5 grid grid-cols-1 gap-3">
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
                      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Idioma</span>
                        <span className="text-[11px] font-bold uppercase text-[var(--text-main)]">{(user.preferred_language || 'pt').startsWith('en') ? 'EN' : 'PT'}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Importação em lote" subtitle="Adicionar múltiplos agentes a partir de Excel com validação automática" className="rounded-[1.75rem]">
          <div className="mt-3 space-y-4">
            <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--text-main)]">Excel suportado</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    A planilha pode estar em <strong>.xlsx</strong> ou <strong>.xls</strong>. Se um número mecanográfico já existir, esse utilizador será ignorado sem quebrar a importação.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <p className={labelClass}>Colunas recomendadas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['nome', 'funcao', 'numero_mecanografico', 'nivel_hierarquico', 'password', 'idioma'].map((field) => (
                  <span key={field} className="rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-main)]">
                    {field}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                O sistema aceita também cabeçalhos equivalentes como <strong>função</strong>, <strong>perfil</strong>, <strong>role</strong> e <strong>número mecanográfico</strong>.
              </p>
            </div>

            <div className="rounded-[1.35rem] border border-dashed border-primary/35 bg-primary/5 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Upload size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--text-main)]">Importar agentes</p>
                    <p className="text-sm text-[var(--text-muted)]">Validação de duplicados, perfis e linhas inválidas automaticamente.</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleSpreadsheetChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImportingUsers}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload size={16} strokeWidth={3} />
                  {isImportingUsers ? 'A importar planilha...' : 'Importar utilizadores por Excel'}
                </button>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-500">
                  <ShieldCheck size={18} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--text-main)]">Validação aplicada</p>
                  <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                    <li>Linhas sem nome, função, número mecanográfico ou perfil são ignoradas.</li>
                    <li>Utilizadores já existentes são ignorados automaticamente.</li>
                    <li>Perfis não reconhecidos pelo sistema não são importados.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
