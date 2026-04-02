import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Camera, 
  MapPin, 
  Shield, 
  Printer 
} from 'lucide-react';
import { Badge } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';
import { User, Report } from '../../types';

interface ReportDetailModalProps {
  report: Report | null;
  currentUser: User | null;
  onClose: () => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  editingData: { descricao: string; fotos: Array<{ file: File; caption: string }> };
  setEditingData: (data: any) => void;
  onSaveEdits: () => void;
  onConclude: (id: number, status: string) => void;
  onApprove: (id: number) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  currentUser,
  onClose,
  isEditing,
  setIsEditing,
  editingData,
  setEditingData,
  onSaveEdits,
  onConclude,
  onApprove
}) => {
  if (!report) return null;

  return (
    <div key="report-details-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md no-print">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter uppercase">Detalhes da Ocorrência</h3>
              <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">ID #{report.id} • {new Date(report.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Título</label>
                <p className="text-lg font-black text-white uppercase tracking-tight">{report.titulo || 'Sem Título'}</p>
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Categoria</label>
                  <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-bold text-zinc-300 uppercase">{report.categoria}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Gravidade</label>
                  <Badge gravidade={report.gravidade} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Status</label>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs uppercase",
                    report.status === 'Concluído'
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  )}>
                    {report.status === 'Concluído' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {report.status || 'Aberto'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Agente Responsável</label>
                <div className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-xs font-black text-black">
                    {report.agente_nome?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">{report.agente_nome}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{report.agente_nivel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Galeria de Evidências</label>
              {isEditing && report.status === 'Aberto' ? (
                <div className="space-y-3">
                  <div 
                    className="border-2 border-dashed border-zinc-800 hover:border-primary/50 transition-all flex flex-col items-center justify-center text-zinc-600 cursor-pointer bg-zinc-900/20 rounded-xl py-6"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-primary/70', 'bg-primary/5');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                      const files = e.dataTransfer.files;
                      if (files) {
                        Array.from(files).forEach((file: File) => {
                          if (file.type && file.type.startsWith('image/')) {
                            setEditingData({...editingData, fotos: [...editingData.fotos, { file, caption: '' }]});
                          }
                        });
                      }
                    }}
                  >
                    <input 
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="edit-report-photos"
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files || []).map(f => ({ file: f as File, caption: '' }));
                        setEditingData({...editingData, fotos: [...editingData.fotos, ...newFiles]});
                      }}
                    />
                    <label htmlFor="edit-report-photos" className="flex flex-col items-center justify-center w-full cursor-pointer">
                      <Camera size={32} strokeWidth={1} />
                      <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Clique ou arraste múltiplas fotos</p>
                    </label>
                  </div>
                  
                  {editingData.fotos.map((foto, idx) => (
                    <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">📷 {foto.file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingData({...editingData, fotos: editingData.fotos.filter((_, i) => i !== idx)})}
                          className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      <input 
                        type="text"
                        placeholder="Legenda/descrição..."
                        value={foto.caption}
                        onChange={(e) => {
                          const newFotos = [...editingData.fotos];
                          newFotos[idx].caption = e.target.value;
                          setEditingData({...editingData, fotos: newFotos});
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              ) : report.photos && report.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {report.photos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 group relative">
                        <img 
                          src={photo.photo_path} 
                          alt={photo.caption || "Evidência"} 
                          className="w-full h-full object-cover" 
                        />
                        <a 
                          href={photo.photo_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm"
                        >
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Ver</span>
                        </a>
                      </div>
                      {photo.caption && (
                        <p className="text-[10px] text-zinc-400 leading-relaxed">{photo.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-video rounded-xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600">
                  <Camera size={32} strokeWidth={1} />
                  <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Nenhuma foto anexada</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Descrição Detalhada</label>
              {isEditing && report.status === 'Aberto' ? (
                <textarea
                  value={editingData.descricao}
                  onChange={(e) => setEditingData({...editingData, descricao: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-primary resize-none min-h-[120px]"
                  placeholder="Edite a descrição da ocorrência..."
                />
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300 leading-relaxed">
                  {report.descricao}
                </div>
              )}
            </div>


            <div className="pt-4 flex items-center gap-6 border-t border-zinc-800/50">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                  LAT: {report.coords_lat ? Number(report.coords_lat).toFixed(4) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                  LNG: {report.coords_lng ? Number(report.coords_lng).toFixed(4) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-between items-center no-print">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Sistema de Segurança MineGuard • Auditoria Ativa</p>
          <div className="flex gap-3">
            {isEditing && report.status === 'Aberto' ? (
              <>
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={onSaveEdits}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20"
                >
                  Salvar Alterações
                </button>
              </>
            ) : (
              <>
                {report.status === 'Aberto' && (
                  <button 
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    Editar
                  </button>
                )}
                {report.status !== 'Aprovado' && (report.status !== 'Concluído' || currentUser?.permissions?.conclude_reports) && (
                  <button 
                    onClick={() => onConclude(report.id, report.status || 'Aberto')}
                    className={cn(
                      "font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center gap-2",
                      report.status === 'Concluído'
                        ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                    )}
                  >
                    {report.status === 'Concluído' ? (
                      <>
                        <Clock size={14} />
                        Reabrir Relatório
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Concluir Relatório
                      </>
                    )}
                  </button>
                )}

                {report.status !== 'Aprovado' && report.status === 'Concluído' && currentUser?.permissions?.approve_reports && (
                  <button 
                    onClick={() => onApprove(report.id)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                  >
                    <Shield size={14} />
                    Aprovar (Selar)
                  </button>
                )}
                <button 
                  onClick={() => window.print()}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest flex items-center gap-2"
                >
                  <Printer size={14} />
                  Exportar PDF
                </button>
                <button 
                  onClick={onClose}
                  className="bg-zinc-100 hover:bg-white text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest"
                >
                  Fechar Detalhes
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
