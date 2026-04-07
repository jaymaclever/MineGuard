import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Gravidade } from '../../types';

export const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'relative w-full group flex items-center gap-3 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all duration-300',
      active
        ? 'bg-primary/5 text-primary'
        : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-main)]'
    )}
  >
    {active && <motion.div layoutId="active-nav" className="absolute left-0 h-2/3 w-1 rounded-r-full bg-primary" />}
    <Icon size={18} className={cn('transition-transform group-hover:scale-110', active ? 'text-primary glow-amber' : 'text-[var(--text-faint)]')} />
    <span className="truncate">{label}</span>
  </button>
);

export const Badge = ({ gravidade }: { gravidade: Gravidade }) => {
  const colors = {
    G1: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    G2: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
    G3: 'border-primary/20 bg-primary/10 text-primary',
    G4: 'animate-pulse-critical border-red-500/20 bg-red-500/10 text-red-500',
  };

  return (
    <span className={cn('rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm', colors[gravidade])}>
      {gravidade}
    </span>
  );
};

export const Card = ({
  children,
  className,
  title,
  subtitle,
  action,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  key?: any;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn('glass-card overflow-hidden rounded-2xl group', onClick && 'cursor-pointer hover:bg-[var(--surface-2)] active:scale-[0.99]', className)}
    style={{ borderRadius: 'var(--template-card-radius)' }}
  >
    {(title || action) && (
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)]/80 p-4 md:p-5">
        <div>
          {title && <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-main)]">{title}</h3>}
          {subtitle && <p className="mt-1 text-[10px] font-bold text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div style={{ padding: 'var(--template-card-padding)' }}>{children}</div>
  </div>
);

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    toast.success(`Idioma alterado para ${lang === 'pt-BR' ? 'Português' : 'English'}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleLanguageChange('pt-BR')}
          className={cn(
            'rounded-lg px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all',
            i18n.language === 'pt-BR' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          )}
        >
          Português (BR)
        </button>
        <button
          onClick={() => handleLanguageChange('en-US')}
          className={cn(
            'rounded-lg px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all',
            i18n.language === 'en-US' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          )}
        >
          English (US)
        </button>
      </div>
      <p className="text-[10px] text-zinc-500">Idioma atual: {i18n.language === 'pt-BR' ? 'Português Brasileiro' : 'English'}</p>
    </div>
  );
};

export const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 md:px-5">
      <div className="text-xs text-[var(--text-muted)] md:text-sm">
        Página <span className="font-bold text-[var(--text-main)]">{currentPage}</span> de <span className="font-bold text-[var(--text-main)]">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-main)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          ← Anterior
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-main)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
};
