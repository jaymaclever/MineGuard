import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Shield, 
  Activity, 
  Bell 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Gravidade } from '../../types';

export const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all duration-300 relative group",
      active 
        ? "text-primary bg-primary/5" 
        : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
    )}
  >
    {active && <motion.div layoutId="active-nav" className="absolute left-0 w-1 h-2/3 bg-primary rounded-r-full" />}
    <Icon size={18} className={cn("transition-transform group-hover:scale-110", active ? "text-primary glow-amber" : "text-zinc-600")} />
    <span className="truncate">{label}</span>
  </button>
);

export const Badge = ({ gravidade }: { gravidade: Gravidade }) => {
  const colors = {
    G1: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    G2: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    G3: 'bg-primary/10 text-primary text-primary/90 border-primary/20',
    G4: 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse-critical',
  };
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest shadow-sm", 
      colors[gravidade]
    )}>
      {gravidade}
    </span>
  );
};

export const Card = ({ children, className, title, subtitle, action, onClick }: { children?: React.ReactNode, className?: string, title?: string, subtitle?: string, action?: React.ReactNode, key?: any, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "glass-card rounded-2xl overflow-hidden group", 
      onClick && "cursor-pointer hover:bg-zinc-900/40 active:scale-[0.99]",
      className
    )}
  >
    {(title || action) && (
      <div className="p-4 md:p-6 border-b border-zinc-800/40 flex items-center justify-between bg-white/[0.02]">
        <div>
          {title && <h3 className="text-xs font-black text-zinc-100 uppercase tracking-[0.2em]">{title}</h3>}
          {subtitle && <p className="text-[10px] text-zinc-500 mt-1 font-bold">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-4 md:p-6">{children}</div>
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
            "py-3 px-4 rounded-lg font-bold uppercase text-[10px] tracking-widest transition-all",
            i18n.language === 'pt-BR' 
              ? "bg-primary text-black shadow-lg shadow-primary/20" 
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          )}
        >
          Português (BR)
        </button>
        <button 
          onClick={() => handleLanguageChange('en-US')}
          className={cn(
            "py-3 px-4 rounded-lg font-bold uppercase text-[10px] tracking-widest transition-all",
            i18n.language === 'en-US' 
              ? "bg-primary text-black shadow-lg shadow-primary/20" 
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          )}
        >
          English (US)
        </button>
      </div>
      <p className="text-[10px] text-zinc-500">Idioma atual: {i18n.language === 'pt-BR' ? 'Português Brasileiro' : 'English'}</p>
    </div>
  );
};

export const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
  return (
    <div className="flex items-center justify-between py-4 px-6 bg-zinc-900/30 border-t border-zinc-800/50">
      <div className="text-sm text-zinc-400">
        Página <span className="font-bold text-zinc-200">{currentPage}</span> de <span className="font-bold text-zinc-200">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed"
        >
          Próximo →
        </button>
      </div>
    </div>
  );
};
