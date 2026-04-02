import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Shield, Activity, Bell, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';
import { User } from '../../types';

interface AlertsTabProps {
  currentUser: User | null;
  alerts: any[];
  onCreateAlert: (alert: any) => Promise<boolean>;
  onDeleteAlert: (id: number) => Promise<void>;
  onUpdateAlert: (id: number, alert: any) => Promise<boolean>;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ 
  currentUser, 
  alerts, 
  onCreateAlert, 
  onDeleteAlert,
  onUpdateAlert
}) => {
  const [newAlert, setNewAlert] = useState({ titulo: '', mensagem: '', tipo: 'aviso' });
  const [isCreating, setIsCreating] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ titulo: '', mensagem: '', tipo: 'aviso' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onCreateAlert(newAlert);
    if (success) {
      setNewAlert({ titulo: '', mensagem: '', tipo: 'aviso' });
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: number) => {
    const success = await onUpdateAlert(id, editForm);
    if (success) setEditingAlertId(null);
  };

  const startEditing = (alert: any) => {
    setEditingAlertId(alert.id);
    setEditForm({ titulo: alert.titulo, mensagem: alert.mensagem, tipo: alert.tipo });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Alertas & Avisos</h2>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Comunicação em tempo real para a equipe de campo</p>
        </div>
        {currentUser?.permissions?.create_alerts && (
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-5 py-2.5 rounded-lg transition-all uppercase tracking-widest"
          >
            {isCreating ? <X size={16} /> : <Plus size={16} />}
            {isCreating ? 'Cancelar' : 'Novo Alerta'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card title="Criar Alerta Operacional" subtitle="Esta mensagem será enviada para todos os agentes ativos">
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Título do Alerta</label>
                    <input 
                      type="text"
                      required
                      value={newAlert.titulo}
                      onChange={(e) => setNewAlert({...newAlert, titulo: e.target.value})}
                      placeholder="Ex: Manutenção de Emergência"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Severidade</label>
                    <select 
                      value={newAlert.tipo}
                      onChange={(e) => setNewAlert({...newAlert, tipo: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="aviso">⚠️ Aviso (Geral)</option>
                      <option value="critico">🚨 Crítico (Ação Imediata)</option>
                      <option value="informativo">ℹ️ Informativo (Baixo Impacto)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Mensagem Detalhada</label>
                  <textarea 
                    required
                    value={newAlert.mensagem}
                    onChange={(e) => setNewAlert({...newAlert, mensagem: e.target.value})}
                    placeholder="Descreva o alerta..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[100px] resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-6 py-3 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Publicar Alerta na Rede
                </button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alerts.map((alert: any) => {
          const isEditing = editingAlertId === alert.id;
          const bgColors = {
            critico: "bg-red-500/5 border-red-500/20 shadow-red-500/5",
            aviso: "bg-orange-500/5 border-orange-500/20 shadow-orange-500/5",
            informativo: "bg-blue-500/5 border-blue-500/20 shadow-blue-500/5"
          };
          
          return (
            <Card 
              key={alert.id} 
              className={cn("transition-all group border-t-2", 
                alert.tipo === 'critico' ? 'border-t-red-500' : 
                alert.tipo === 'aviso' ? 'border-t-orange-500' : 'border-t-blue-500'
              )}
            >
              {isEditing ? (
                <div className="space-y-4">
                  <input 
                    type="text" 
                    value={editForm.titulo}
                    onChange={(e) => setEditForm({...editForm, titulo: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm font-bold"
                  />
                  <textarea 
                    value={editForm.mensagem}
                    onChange={(e) => setEditForm({...editForm, mensagem: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(alert.id)} className="flex-1 bg-primary/20 text-primary py-1 rounded text-[10px] font-black uppercase"><Check size={14} className="mx-auto" /></button>
                    <button onClick={() => setEditingAlertId(null)} className="flex-1 bg-zinc-800 text-zinc-400 py-1 rounded text-[10px] font-black uppercase"><X size={14} className="mx-auto" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg", 
                      alert.tipo === 'critico' ? 'bg-red-500/10 text-red-500' : 
                      alert.tipo === 'aviso' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                    )}>
                      {alert.tipo === 'critico' ? <Shield size={20} /> : alert.tipo === 'aviso' ? <AlertTriangle size={20} /> : <Bell size={20} />}
                    </div>
                    {currentUser?.id === alert.created_by && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditing(alert)} className="p-1.5 text-zinc-600 hover:text-blue-400 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => onDeleteAlert(alert.id)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <h3 className="font-black text-zinc-100 uppercase tracking-tight mb-2 truncate">{alert.titulo}</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3 mb-4">{alert.mensagem}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-500 uppercase">{alert.creator_name?.charAt(0)}</div>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">{alert.creator_name}</span>
                    </div>
                    <span className="text-[9px] font-bold text-zinc-600">{new Date(alert.timestamp).toLocaleDateString()}</span>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
      
      {alerts.length === 0 && (
        <div className="py-20 text-center">
          <Activity className="mx-auto text-zinc-800 mb-4 opacity-10" size={64} />
          <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Silêncio operacional: nenhum alerta ativo</p>
        </div>
      )}
    </motion.div>
  );
};

import { AnimatePresence } from 'motion/react';
