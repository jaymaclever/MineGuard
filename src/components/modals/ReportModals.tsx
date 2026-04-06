import React from 'react';
import { motion } from 'motion/react';
import { Camera, Images, XCircle } from 'lucide-react';
import { Badge } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';

type NewReportPhoto = { file: File; caption: string };

interface NewReportState {
  titulo: string;
  categoria: string;
  gravidade: string;
  descricao: string;
  setor: string;
  pessoas_envolvidas: string;
  equipamento: string;
  acao_imediata: string;
  requer_investigacao: boolean;
  testemunhas: string;
  potencial_risco: string;
  fotos: NewReportPhoto[];
  metadata?: Record<string, any>;
}

interface SettingItem {
  key: string;
  value: string;
}

interface NewReportModalProps {
  isOpen: boolean;
  showPreview: boolean;
  newReport: NewReportState;
  newReportStep: number;
  systemSettings: SettingItem[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onPreview: () => void;
  onClosePreview: () => void;
  onConfirmPreview: () => Promise<void>;
  onNextStep: () => void;
  onPreviousStep: () => void;
  setNewReportStep: React.Dispatch<React.SetStateAction<number>>;
  setNewReport: React.Dispatch<React.SetStateAction<any>>;
  addNewReportPhotos: (files: File[]) => void;
}

const wizardSteps = [
  { step: 1, label: 'Contexto', hint: 'O que aconteceu e onde' },
  { step: 2, label: 'Detalhes', hint: 'Impacto, pessoas e risco' },
  { step: 3, label: 'EvidÃªncias', hint: 'AÃ§Ã£o imediata e anexos' },
];

const getConfiguredSectors = (settings: SettingItem[]) =>
  (settings.find((item) => item.key === 'form_sectors')?.value || '')
    .split(',')
    .map((sector) => sector.trim())
    .filter(Boolean);

export const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  showPreview,
  newReport,
  newReportStep,
  systemSettings,
  onClose,
  onSubmit,
  onPreview,
  onClosePreview,
  onConfirmPreview,
  onNextStep,
  onPreviousStep,
  setNewReportStep,
  setNewReport,
  addNewReportPhotos,
}) => {
  if (!isOpen && !showPreview) return null;

  const configuredSectors = getConfiguredSectors(systemSettings);

  return (
    <>
      {isOpen && (
        <div key="new-report-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-0 backdrop-blur-md no-print md:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden border border-zinc-800 bg-[linear-gradient(180deg,rgba(17,18,22,0.98),rgba(9,9,11,0.98))] shadow-2xl md:h-auto md:max-h-[92vh] md:rounded-[2rem]"
          >
            <form onSubmit={onSubmit} className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-950/60 px-5 py-5 md:px-7">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Nova ocorrÃªncia</p>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white">Registar ocorrÃªncia</h3>
                </div>
                <button type="button" onClick={onClose} className="text-zinc-500 transition-colors hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6 md:max-h-[72vh]">
                <div className="rounded-[1.5rem] border border-zinc-800/70 bg-zinc-950/50 p-4 md:p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {wizardSteps.map((item) => (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => setNewReportStep(item.step)}
                        className={cn(
                          'rounded-2xl border px-3 py-3 text-left transition-all',
                          newReportStep === item.step
                            ? 'border-primary/40 bg-primary/10'
                            : newReportStep > item.step
                              ? 'border-emerald-500/30 bg-emerald-500/8'
                              : 'border-zinc-800/80 bg-zinc-950/40'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black uppercase',
                              newReportStep === item.step
                                ? 'bg-primary text-black'
                                : newReportStep > item.step
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-zinc-900 text-zinc-400'
                            )}
                          >
                            {item.step}
                          </div>
                          <div className="min-w-0">
                            <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', newReportStep === item.step ? 'text-primary' : 'text-zinc-300')}>
                              {item.label}
                            </p>
                            <p className="mt-1 hidden text-[11px] text-zinc-500 md:block">{item.hint}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn('space-y-5', newReportStep !== 1 && 'hidden')}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">TÃ­tulo da ocorrÃªncia</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: IntrusÃ£o Setor Norte"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                      value={newReport.titulo}
                      onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, titulo: event.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoria</label>
                      <select
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                        value={newReport.categoria}
                        onChange={(event) =>
                          setNewReport((current: NewReportState) => ({
                            ...current,
                            categoria: event.target.value,
                            metadata: {},
                          }))
                        }
                      >
                        <option value="Valores">ProteÃ§Ã£o de Valores</option>
                        <option value="PerÃ­metro">PerÃ­metro</option>
                        <option value="Safety">Safety (HSE)</option>
                        <option value="Operativo">Operativo</option>
                        <option value="LogÃ­stica">LogÃ­stica</option>
                        <option value="ManutenÃ§Ã£o">ManutenÃ§Ã£o de Planta</option>
                        <option value="Informativo">Informativo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gravidade</label>
                      <select
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                        value={newReport.gravidade}
                        onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, gravidade: event.target.value }))}
                      >
                        <option value="G1">G1 (Baixa)</option>
                        <option value="G2">G2 (MÃ©dia)</option>
                        <option value="G3">G3 (Alta)</option>
                        <option value="G4">G4 (CrÃ­tica)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">DescriÃ§Ã£o da ocorrÃªncia</label>
                    <textarea
                      required
                      className="min-h-[100px] w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                      placeholder="Descreva detalhadamente o que aconteceu..."
                      value={newReport.descricao}
                      onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, descricao: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={cn('space-y-5', newReportStep !== 2 && 'hidden')}>
                  {newReport.categoria === 'Safety' && (
                    <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-orange-400">Tipo de incidente (Safety)</label>
                        <select
                          required
                          className="w-full rounded-lg border border-orange-500/50 bg-zinc-950 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none"
                          value={newReport.metadata?.incidentType || ''}
                          onChange={(event) =>
                            setNewReport((current: NewReportState) => ({
                              ...current,
                              metadata: { ...current.metadata, incidentType: event.target.value },
                            }))
                          }
                        >
                          <option value="">Selecione...</option>
                          <option value="Queda">Queda de mesmo nÃ­vel</option>
                          <option value="Esmagamento">Risco de esmagamento</option>
                          <option value="Quimico">Derramamento quÃ­mico</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-orange-400">Uso de EPI</label>
                        <select
                          required
                          className="w-full rounded-lg border border-orange-500/50 bg-zinc-950 px-3 py-2 text-xs focus:border-orange-500 focus:outline-none"
                          value={newReport.metadata?.ppeUsage || ''}
                          onChange={(event) =>
                            setNewReport((current: NewReportState) => ({
                              ...current,
                              metadata: { ...current.metadata, ppeUsage: event.target.value },
                            }))
                          }
                        >
                          <option value="">Selecione...</option>
                          <option value="Total">Sim, todos adequados</option>
                          <option value="Parcial">Parcial / inadequado</option>
                          <option value="Nenhum">NÃ£o estava a usar</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Setor / local</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {configuredSectors.map((sector) => {
                          const selectedSectors = newReport.setor ? newReport.setor.split(', ') : [];
                          const isSelected = selectedSectors.includes(sector);
                          return (
                            <button
                              key={sector}
                              type="button"
                              onClick={() => {
                                const updated = isSelected
                                  ? selectedSectors.filter((item) => item !== sector)
                                  : [...selectedSectors, sector];
                                setNewReport((current: NewReportState) => ({ ...current, setor: updated.join(', ') }));
                              }}
                              className={cn(
                                'rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest outline-none transition-all',
                                isSelected
                                  ? 'glow-amber-sm border-primary/50 bg-primary/20 text-primary'
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                              )}
                            >
                              {sector}
                            </button>
                          );
                        })}
                        {configuredSectors.length === 0 && <p className="text-[10px] italic text-zinc-600">Nenhum setor parametrizado.</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pessoas envolvidas</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Quantas?"
                        value={newReport.pessoas_envolvidas}
                        onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, pessoas_envolvidas: event.target.value }))}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Equipamento</label>
                      <input
                        type="text"
                        placeholder="Ex: Escavadora 01"
                        value={newReport.equipamento}
                        onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, equipamento: event.target.value }))}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Potencial de risco</label>
                      <select
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                        value={newReport.potencial_risco}
                        onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, potencial_risco: event.target.value }))}
                      >
                        <option value="">Selecione...</option>
                        <option value="Baixo">Baixo</option>
                        <option value="MÃ©dio">MÃ©dio</option>
                        <option value="Alto">Alto</option>
                        <option value="CrÃ­tico">CrÃ­tico</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Testemunhas</label>
                    <input
                      type="text"
                      placeholder="Nomes separados por vÃ­rgula"
                      value={newReport.testemunhas}
                      onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, testemunhas: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className={cn('space-y-5', newReportStep !== 3 && 'hidden')}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AÃ§Ã£o imediata tomada</label>
                    <textarea
                      className="min-h-[60px] w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                      placeholder="O que foi feito no momento?"
                      value={newReport.acao_imediata}
                      onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, acao_imediata: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-4 border-t border-zinc-800/50 pt-2">
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                      <input
                        type="checkbox"
                        id="investigacao"
                        checked={newReport.requer_investigacao}
                        onChange={(event) => setNewReport((current: NewReportState) => ({ ...current, requer_investigacao: event.target.checked }))}
                        className="h-5 w-5 cursor-pointer rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/20"
                      />
                      <label htmlFor="investigacao" className="flex-1 cursor-pointer text-sm font-bold text-zinc-300">
                        Esta ocorrÃªncia requer investigaÃ§Ã£o formal
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Galeria de evidÃªncias</label>
                    <div
                      className="relative mb-3 group"
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.currentTarget.classList.add('border-primary/70', 'bg-primary/5');
                      }}
                      onDragLeave={(event) => {
                        event.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.currentTarget.classList.remove('border-primary/70', 'bg-primary/5');
                        addNewReportPhotos(Array.from(event.dataTransfer.files));
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        id="report-photos"
                        onChange={(event) => {
                          addNewReportPhotos(Array.from(event.target.files || []));
                          event.currentTarget.value = '';
                        }}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        id="report-camera"
                        onChange={(event) => {
                          addNewReportPhotos(Array.from(event.target.files || []));
                          event.currentTarget.value = '';
                        }}
                      />
                      <div className="rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900 py-5 transition-all hover:border-primary/50 hover:bg-zinc-900/50">
                        <div className="flex flex-col items-center gap-3 px-4 text-center">
                          <Camera className="text-zinc-500 transition-colors group-hover:text-primary" size={24} />
                          <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300">Arraste fotografias aqui ou escolha uma das opções abaixo</span>
                          <div className="flex w-full flex-col gap-2 sm:flex-row">
                            <label
                              htmlFor="report-photos"
                              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-primary/50 hover:text-white"
                            >
                              <Images size={16} />
                              Importar fotografias
                            </label>
                            <label
                              htmlFor="report-camera"
                              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15"
                            >
                              <Camera size={16} />
                              Tirar fotografia
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {newReport.fotos.length > 0 && (
                      <div className="space-y-2">
                        {newReport.fotos.map((photo, index) => (
                          <div key={`${photo.file.name}-${index}`} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-300">{photo.file.name}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setNewReport((current: NewReportState) => ({
                                    ...current,
                                    fotos: current.fotos.filter((_, photoIndex) => photoIndex !== index),
                                  }))
                                }
                                className="text-[10px] font-bold uppercase tracking-widest text-red-500 transition-colors hover:text-red-400"
                              >
                                Remover
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Legenda/descrição desta fotografia..."
                              value={photo.caption}
                              onChange={(event) =>
                                setNewReport((current: NewReportState) => {
                                  const updatedPhotos = [...current.fotos];
                                  updatedPhotos[index] = { ...updatedPhotos[index], caption: event.target.value };
                                  return { ...current, fotos: updatedPhotos };
                                })
                              }
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:border-primary focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="no-print flex flex-col-reverse justify-end gap-3 border-t border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row md:p-6">
                {newReportStep > 1 && (
                  <button type="button" onClick={onPreviousStep} className="w-full rounded-lg bg-zinc-800 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:text-white sm:w-auto">
                    Voltar
                  </button>
                )}
                {newReportStep < 3 && (
                  <button type="button" onClick={onNextStep} className="w-full rounded-lg bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary/90 sm:w-auto">
                    PrÃ³ximo
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-all hover:text-white sm:w-auto sm:border-none sm:bg-transparent"
                >
                  Cancelar
                </button>
                <button type="button" onClick={onPreview} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-700 sm:w-auto">
                  Visualizar
                </button>
                <button type="submit" className="w-full rounded-lg bg-primary px-8 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 sm:w-auto">
                  Transmitir relatÃ³rio
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showPreview && (
        <div key="preview-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/20 p-6">
              <h3 className="text-xl font-black uppercase tracking-tighter">VisualizaÃ§Ã£o da ocorrÃªncia</h3>
              <button type="button" onClick={onClosePreview} className="text-zinc-500 transition-colors hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-6 overflow-y-auto p-4 sm:p-6">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">TÃ­tulo</p>
                <p className="text-lg font-bold text-zinc-100">{newReport.titulo || 'Sem tÃ­tulo'}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoria</p>
                  <p className="rounded bg-zinc-900/50 p-2 text-sm text-zinc-300">{newReport.categoria}</p>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Gravidade</p>
                  <div className="inline-block">
                    <Badge gravidade={newReport.gravidade as any} />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">DescriÃ§Ã£o</p>
                <p className="rounded bg-zinc-900/50 p-3 text-sm leading-relaxed text-zinc-300">{newReport.descricao || 'Sem descriÃ§Ã£o'}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {newReport.setor && (
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Setor / local</p>
                    <p className="text-sm text-zinc-300">{newReport.setor}</p>
                  </div>
                )}
                {newReport.pessoas_envolvidas && (
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Pessoas envolvidas</p>
                    <p className="text-sm text-zinc-300">{newReport.pessoas_envolvidas}</p>
                  </div>
                )}
              </div>

              {newReport.equipamento && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Equipamento</p>
                  <p className="text-sm text-zinc-300">{newReport.equipamento}</p>
                </div>
              )}

              {newReport.acao_imediata && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">AÃ§Ã£o imediata</p>
                  <p className="rounded bg-zinc-900/50 p-2 text-sm text-zinc-300">{newReport.acao_imediata}</p>
                </div>
              )}

              {newReport.testemunhas && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Testemunhas</p>
                  <p className="text-sm text-zinc-300">{newReport.testemunhas}</p>
                </div>
              )}

              {newReport.potencial_risco && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Potencial de risco</p>
                  <p className="rounded bg-zinc-900/50 p-2 text-sm text-zinc-300">{newReport.potencial_risco}</p>
                </div>
              )}

              {newReport.requer_investigacao && (
                <div className="rounded border border-red-800/50 bg-red-900/20 p-3">
                  <p className="text-sm font-bold text-red-400">Requer investigaÃ§Ã£o formal</p>
                </div>
              )}

              {newReport.fotos.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">EvidÃªncias ({newReport.fotos.length})</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {newReport.fotos.map((photo, index) => (
                      <div key={`${photo.file.name}-${index}`} className="space-y-1">
                        <img src={URL.createObjectURL(photo.file)} alt={`Preview ${index + 1}`} className="h-32 w-full rounded border border-zinc-800 object-cover" />
                        {photo.caption && <p className="text-xs text-zinc-400">{photo.caption}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900/20 p-6">
              <button type="button" onClick={onClosePreview} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
                Voltar
              </button>
              <button type="button" onClick={onConfirmPreview} className="rounded-lg bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
                Confirmar e enviar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

