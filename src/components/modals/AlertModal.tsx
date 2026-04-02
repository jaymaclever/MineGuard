import React from 'react';
import { motion } from 'motion/react';
import { XCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { titulo: string; mensagem: string; tipo: string };
  setForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  title
}) => {
  if (!isOpen) return null;

  return (
    <div key="alert-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tighter uppercase">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Título</label>
            <input 
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm({...form, titulo: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Mensagem</label>
            <textarea 
              required
              value={form.mensagem}
              onChange={(e) => setForm({...form, mensagem: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[80px] resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Tipo</label>
            <select 
              value={form.tipo}
              onChange={(e) => setForm({...form, tipo: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
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
              className="flex-1 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors border border-zinc-800 rounded-lg"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-6 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              Confirmar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
