import React from 'react';
import { motion } from 'motion/react';
import { XCircle, Camera } from 'lucide-react';
import { Badge } from '../ui/LayoutComponents';
import { Categoria, Gravidade } from '../../types';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  newReport: any;
  setNewReport: (report: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onPreview: () => void;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({ 
  isOpen, 
  onClose, 
  newReport, 
  setNewReport, 
  onSubmit,
  onPreview
}) => {
  if (!isOpen) return null;

  return (
    <div key="new-report-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md no-print">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-lg h-full md:h-auto md:max-h-[90vh] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
      >
        <form onSubmit={onSubmit}>
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
            <h3 className="text-xl font-black tracking-tighter uppercase">Registrar Ocorrência</h3>
            <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <XCircle size={24} />
            </button>
          </div>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Título da Ocorrência</label>
              <input 
                type="text"
                required
                placeholder="Ex: Intrusão Setor Norte"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                value={newReport.titulo}
                onChange={(e) => setNewReport({...newReport, titulo: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  value={newReport.categoria}
                  onChange={(e) => setNewReport({...newReport, categoria: e.target.value as Categoria, metadata: {}})}
                >
                  <option value="Valores">Proteção de Valores</option>
                  <option value="Perímetro">Perímetro</option>
                  <option value="Safety">Safety (HSE)</option>
                  <option value="Operativo">Operativo</option>
                  <option value="Logística">Logística</option>
                  <option value="Manutenção">Manutenção de Planta</option>
                  <option value="Informativo">Informativo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gravidade</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                  value={newReport.gravidade}
                  onChange={(e) => setNewReport({...newReport, gravidade: e.target.value as Gravidade})}
                >
                  <option value="G1">G1 (Baixa)</option>
                  <option value="G2">G2 (Média)</option>
                  <option value="G3">G3 (Alta)</option>
                  <option value="G4">G4 (Crítica)</option>
                </select>
              </div>
            </div>


            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição da Ocorrência</label>
              <textarea 
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[100px] resize-none"
                placeholder="Descreva detalhadamente o que aconteceu..."
                value={newReport.descricao}
                onChange={(e) => setNewReport({...newReport, descricao: e.target.value})}
              />
            </div>

            {newReport.categoria === 'Safety' && (
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 border border-orange-500/30 bg-orange-500/5 rounded-lg">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Tipo de Incidente (Safety)</label>
                  <select 
                    required
                    className="w-full bg-zinc-950 border border-orange-500/50 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-orange-500"
                    value={newReport.metadata?.incidentType || ''}
                    onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, incidentType: e.target.value}})}
                  >
                    <option value="">Selecione...</option>
                    <option value="Queda">Queda de mesmo nível</option>
                    <option value="Esmagamento">Risco de Esmagamento</option>
                    <option value="Quimico">Derramamento Químico</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Uso de EPI</label>
                  <select 
                    required
                    className="w-full bg-zinc-950 border border-orange-500/50 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-orange-500"
                    value={newReport.metadata?.ppeUsage || ''}
                    onChange={(e) => setNewReport({...newReport, metadata: {...newReport.metadata, ppeUsage: e.target.value}})}
                  >
                    <option value="">Selecione...</option>
                    <option value="Total">Sim, todos adequados</option>
                    <option value="Parcial">Parcial / Inadequado</option>
                    <option value="Nenhum">Não estava usando</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Setor/Local</label>
                <input 
                  type="text"
                  placeholder="Ex: Setor Norte, Poço Principal"
                  value={newReport.setor}
                  onChange={(e) => setNewReport({...newReport, setor: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pessoas Envolvidas</label>
                <input 
                  type="number"
                  min="0"
                  placeholder="Quantas?"
                  value={newReport.pessoas_envolvidas}
                  onChange={(e) => setNewReport({...newReport, pessoas_envolvidas: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Equipamento Envolvido</label>
              <input 
                type="text"
                placeholder="Ex: Escavadeira XYZ-100, Caminhão basculante"
                value={newReport.equipamento}
                onChange={(e) => setNewReport({...newReport, equipamento: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ação Imediata Tomada</label>
              <textarea 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[70px] resize-none"
                placeholder="O que foi feito imediatamente após o ocorrido?"
                value={newReport.acao_imediata}
                onChange={(e) => setNewReport({...newReport, acao_imediata: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Testemunhas</label>
              <input 
                type="text"
                placeholder="Nomes das pessoas que presenciaram"
                value={newReport.testemunhas}
                onChange={(e) => setNewReport({...newReport, testemunhas: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Potencial de Risco</label>
              <textarea 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-primary min-h-[70px] resize-none"
                placeholder="Se tivesse piorado, qual seria o risco/consequência potencial?"
                value={newReport.potencial_risco}
                onChange={(e) => setNewReport({...newReport, potencial_risco: e.target.value})}
              />
            </div>

            <div className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
              <input 
                type="checkbox"
                id="investigacao"
                checked={newReport.requer_investigacao}
                onChange={(e) => setNewReport({...newReport, requer_investigacao: e.target.checked})}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="investigacao" className="text-sm font-bold text-zinc-300 cursor-pointer flex-1">
                ⚠️ Esta ocorrência requer investigação formal
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Galeria de Evidências</label>
              <div 
                className="relative group mb-3"
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
                        setNewReport({...newReport, fotos: [...newReport.fotos, { file, caption: '' }]});
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
                  id="report-photos"
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files || []).map(f => ({ file: f as File, caption: '' }));
                    setNewReport({...newReport, fotos: [...newReport.fotos, ...newFiles]});
                  }}
                />
                <label 
                  htmlFor="report-photos"
                  className="flex items-center justify-center gap-3 w-full bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl py-6 cursor-pointer hover:border-primary/50 hover:bg-zinc-900/50 transition-all"
                >
                  <Camera className="text-zinc-500 group-hover:text-primary transition-colors" size={24} />
                  <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300">
                    Clique ou arraste múltiplas fotos aqui
                  </span>
                </label>
              </div>
              
              {newReport.fotos.length > 0 && (
                <div className="space-y-2">
                  {newReport.fotos.map((foto: any, idx: number) => (
                    <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">📷 {foto.file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setNewReport({...newReport, fotos: newReport.fotos.filter((_: any, i: number) => i !== idx)})}
                          className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors"
                        >
                          ✕ REMOVER
                        </button>
                      </div>
                      <input 
                        type="text"
                        placeholder="Legenda/descrição desta foto..."
                        value={foto.caption}
                        onChange={(e) => {
                          const newFotos = [...newReport.fotos];
                          newFotos[idx].caption = e.target.value;
                          setNewReport({...newReport, fotos: newFotos});
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancelar</button>
            <button type="button" onClick={onPreview} className="bg-zinc-700 hover:bg-zinc-600 text-white font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest">Visualizar</button>
            <button type="submit" className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20">Transmitir Relatório</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  newReport: any;
  onSubmit: (e: React.FormEvent) => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  newReport, 
  onSubmit 
}) => {
  if (!isOpen) return null;

  return (
    <div key="preview-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
          <h3 className="text-xl font-black tracking-tighter uppercase">Visualização da Ocorrência</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Título</p>
            <p className="text-lg font-bold text-zinc-100">{newReport.titulo || 'Sem título'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Categoria</p>
              <p className="text-sm text-zinc-300 bg-zinc-900/50 p-2 rounded">{newReport.categoria}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Gravidade</p>
              <div className="inline-block"><Badge gravidade={newReport.gravidade} /></div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Descrição</p>
            <p className="text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded leading-relaxed">{newReport.descricao || 'Sem descrição'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {newReport.setor && (
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Setor/Local</p>
                <p className="text-sm text-zinc-300">{newReport.setor}</p>
              </div>
            )}
            {newReport.pessoas_envolvidas && (
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Pessoas Envolvidas</p>
                <p className="text-sm text-zinc-300">{newReport.pessoas_envolvidas}</p>
              </div>
            )}
          </div>

          {newReport.equipamento && (
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Equipamento</p>
              <p className="text-sm text-zinc-300">{newReport.equipamento}</p>
            </div>
          )}

          {newReport.acao_imediata && (
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Ação Imediata</p>
              <p className="text-sm text-zinc-300 bg-zinc-900/50 p-2 rounded">{newReport.acao_imediata}</p>
            </div>
          )}

          {newReport.testemunhas && (
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Testemunhas</p>
              <p className="text-sm text-zinc-300">{newReport.testemunhas}</p>
            </div>
          )}

          {newReport.potencial_risco && (
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Potencial de Risco</p>
              <p className="text-sm text-zinc-300 bg-zinc-900/50 p-2 rounded">{newReport.potencial_risco}</p>
            </div>
          )}

          {newReport.requer_investigacao && (
            <div className="bg-red-900/20 border border-red-800/50 p-3 rounded">
              <p className="text-sm font-bold text-red-400">⚠️ Requer Investigação Formal</p>
            </div>
          )}

          {newReport.fotos.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Evidências ({newReport.fotos.length})</p>
              <div className="grid grid-cols-2 gap-3">
                {newReport.fotos.map((foto: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <img src={URL.createObjectURL(foto.file)} alt={`Preview ${idx}`} className="w-full h-32 object-cover rounded border border-zinc-800" />
                    {foto.caption && <p className="text-xs text-zinc-400">{foto.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-6 bg-zinc-900/20 border-t border-zinc-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Voltar</button>
          <button type="button" onClick={(e) => { onClose(); onSubmit(e); }} className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] px-8 py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-primary/20">Confirmar e Enviar</button>
        </div>
      </motion.div>
    </div>
  );
};
