import React from 'react';
import { motion } from 'motion/react';
import { CloudUpload, RefreshCcw, Clock } from 'lucide-react';

interface SyncConflictModalProps {
  isOpen: boolean;
  offlineDraft: any;
  serverVersion: any;
  onSync: () => void;
  onClear: () => void;
}

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  isOpen,
  offlineDraft,
  serverVersion,
  onSync,
  onClear
}) => {
  if (!isOpen || !offlineDraft) return null;

  return (
    <div key="sync-modal" className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-orange-500/30 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl shadow-orange-500/10"
      >
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto border border-orange-500/20">
            <CloudUpload size={40} className="text-orange-500" strokeWidth={1.5} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tighter uppercase text-white">Sincronização Pendente</h3>
            <p className="text-xs text-zinc-500 font-medium leading-relaxed">
              Detectámos um rascunho guardado enquanto estavas sem rede. <br/>
              Desejas enviar este relatório ou manter os dados do servidor?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Local Version */}
            <div className="bg-zinc-900/50 rounded-2xl p-4 border border-orange-500/30 text-left relative overflow-hidden ring-1 ring-orange-500/20 shadow-inner shadow-orange-500/5">
              <div className="absolute top-0 right-0 p-2 bg-orange-500/20 rounded-bl-xl border-l border-b border-orange-500/30 backdrop-blur-sm z-10">
                <span className="text-[9px] font-black uppercase text-orange-400 tracking-widest">A minha versão</span>
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Relatório offline</p>
              <p className="text-sm font-bold text-zinc-100 leading-tight">"{offlineDraft.titulo || 'Sem Título'}"</p>
              {offlineDraft.descricao && (
                <p className="text-[11px] text-zinc-400 mt-2 line-clamp-3 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 italic leading-relaxed">
                  {offlineDraft.descricao}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Clock size={10} className="text-orange-500/50" />
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Salvo às: {new Date(offlineDraft.savedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Server Version (Conflict) */}
            {offlineDraft.syncType === 'EDIT' && serverVersion && (
              <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-500/20 text-left relative overflow-hidden transition-all hover:bg-blue-500/10">
                <div className="absolute top-0 right-0 p-2 bg-blue-500/20 rounded-bl-xl border-l border-b border-blue-500/30 backdrop-blur-sm z-10">
                  <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest">No Servidor</span>
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Versão actual (Outro dispositivo?)</p>
                <p className="text-sm font-bold text-zinc-400 italic">No sistema já existe esta informação:</p>
                <p className="text-[11px] text-zinc-500 mt-2 line-clamp-3 bg-blue-900/10 p-2 rounded-lg border border-blue-900/20 leading-relaxed">
                  {serverVersion.descricao}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <motion.button 
              whileTap={{ scale: 0.97 }}
              onClick={onSync}
              className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black text-xs py-4 rounded-xl uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 border border-orange-400/30"
            >
              <RefreshCcw size={16} strokeWidth={3} className="animate-[spin_4s_linear_infinite]" />
              {offlineDraft.syncType === 'EDIT' ? 'Substituir Versão do Servidor' : 'Sincronizar Relatório Agora'}
            </motion.button>
            <button 
              onClick={onClear}
              className="w-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white font-black text-[10px] py-4 rounded-xl uppercase tracking-widest transition-all border border-zinc-800"
            >
              {offlineDraft.syncType === 'EDIT' ? 'Manter Versão do Servidor' : 'Descartar Rascunho'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
