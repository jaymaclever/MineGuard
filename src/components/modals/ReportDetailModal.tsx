import React from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle2, Clock, FileText, Images, MapPin, Printer, Shield, Trash2, XCircle } from 'lucide-react';
import { Badge } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';

interface ReportPhoto {
  id: number;
  photo_path: string;
  caption: string;
}

interface ReportData {
  id: number;
  titulo: string;
  categoria: string;
  gravidade: string;
  descricao: string;
  coords_lat: number | string;
  coords_lng: number | string;
  status: string;
  timestamp: string;
  agente_nome: string;
  agente_nivel: string;
  setor?: string;
  equipamento?: string;
  acao_imediata?: string;
  testemunhas?: string;
  potencial_risco?: string;
  photos?: ReportPhoto[];
}

interface EditingReportData {
  titulo: string;
  descricao: string;
  setor: string;
  equipamento: string;
  acao_imediata: string;
  testemunhas: string;
  potencial_risco: string;
  fotos: Array<{ file: File; caption: string }>;
}

interface ReportDetailModalProps {
  report: ReportData | null;
  currentUser: any;
  systemSettings: Array<{ key: string; value: string }>;
  isEditing: boolean;
  editingData: EditingReportData;
  onClose: () => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  setEditingData: React.Dispatch<React.SetStateAction<any>>;
  addEditingReportPhotos: (files: File[]) => void;
  onSaveEdits: () => void;
  onConclude: (id: number, status: string) => void;
  onApprove: (id: number) => void;
  onDelete: (id: number) => void;
}

const getConfiguredSectors = (settings: Array<{ key: string; value: string }>) =>
  (settings.find((item) => item.key === 'form_sectors')?.value || '')
    .split(',')
    .map((sector) => sector.trim())
    .filter(Boolean);

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  currentUser,
  systemSettings,
  isEditing,
  editingData,
  onClose,
  onStartEditing,
  onCancelEditing,
  setEditingData,
  addEditingReportPhotos,
  onSaveEdits,
  onConclude,
  onApprove,
  onDelete,
}) => {
  if (!report) return null;

  const configuredSectors = getConfiguredSectors(systemSettings);

  return (
    <div key="report-details-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-0 backdrop-blur-xl no-print md:p-4">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.98 }}
        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden border-zinc-800 bg-[linear-gradient(180deg,rgba(17,18,22,0.98),rgba(9,9,11,0.98))] shadow-2xl md:h-[90vh] md:rounded-[2rem] md:border"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-950/60 px-5 py-5 md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Detalhes da ocorrÃªncia</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ID #{report.id} â€¢ {new Date(report.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.status === 'ConcluÃ­do' && (
              <div className="hidden items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 md:flex">
                <CheckCircle2 size={12} className="text-green-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-green-500">RelatÃ³rio selado</span>
              </div>
            )}
            <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-white">
              <XCircle size={24} />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:space-y-8 lg:p-8 md:max-h-[80vh]">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:gap-10">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">TÃ­tulo</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editingData.titulo}
                    onChange={(event) => setEditingData((current: EditingReportData) => ({ ...current, titulo: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                ) : (
                  <p className="text-lg font-black uppercase tracking-tight text-white">{report.titulo || 'Sem tÃ­tulo'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoria</label>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                    <span className="text-xs font-bold uppercase text-zinc-300">{report.categoria}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Gravidade</label>
                  <Badge gravidade={report.gravidade as any} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Setor / local</label>
                  {isEditing ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {configuredSectors.map((sector) => {
                        const selectedSectors = editingData.setor ? editingData.setor.split(', ') : [];
                        const isSelected = selectedSectors.includes(sector);
                        return (
                          <button
                            key={sector}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? selectedSectors.filter((item) => item !== sector)
                                : [...selectedSectors, sector];
                              setEditingData((current: EditingReportData) => ({ ...current, setor: updated.join(', ') }));
                            }}
                            className={cn(
                              'rounded-md border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest outline-none transition-all',
                              isSelected
                                ? 'border-primary/50 bg-primary/20 text-primary'
                                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            )}
                          >
                            {sector}
                          </button>
                        );
                      })}
                      {configuredSectors.length === 0 && <p className="text-[10px] italic text-zinc-600">Nenhum setor parametrizado.</p>}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-3 text-sm font-bold text-zinc-300">{report.setor || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Equipamento</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingData.equipamento || ''}
                      onChange={(event) => setEditingData((current: EditingReportData) => ({ ...current, equipamento: event.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <p className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-3 text-sm font-bold text-zinc-300">{report.equipamento || 'N/A'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">AÃ§Ã£o imediata tomada</label>
                {isEditing ? (
                  <textarea
                    value={editingData.acao_imediata || ''}
                    onChange={(event) => setEditingData((current: EditingReportData) => ({ ...current, acao_imediata: event.target.value }))}
                    className="min-h-[60px] w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300 focus:border-primary focus:outline-none"
                  />
                ) : (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-sm italic leading-relaxed text-zinc-300">"{report.acao_imediata || 'Nenhuma aÃ§Ã£o registada'}"</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-500">InformaÃ§Ãµes adicionais</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between rounded-lg border border-zinc-900 bg-zinc-900/30 p-3">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Testemunhas</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingData.testemunhas || ''}
                        onChange={(event) => setEditingData((current: EditingReportData) => ({ ...current, testemunhas: event.target.value }))}
                        className="bg-transparent text-right text-xs font-bold text-zinc-200 focus:outline-none"
                        placeholder="Nomes..."
                      />
                    ) : (
                      <span className="text-[10px] font-black uppercase text-zinc-300">{report.testemunhas || 'Nenhuma'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-zinc-900 bg-zinc-900/30 p-3">
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Potencial de risco</span>
                    {isEditing ? (
                      <select
                        value={editingData.potencial_risco || ''}
                        onChange={(event) => setEditingData((current: EditingReportData) => ({ ...current, potencial_risco: event.target.value }))}
                        className="bg-transparent text-right text-xs font-bold text-zinc-200 focus:outline-none"
                      >
                        <option value="">Selecione...</option>
                        <option value="Baixo">Baixo</option>
                        <option value="MÃ©dio">MÃ©dio</option>
                        <option value="Alto">Alto</option>
                        <option value="CrÃ­tico">CrÃ­tico</option>
                      </select>
                    ) : (
                      <span className={cn('text-[10px] font-black uppercase', report.potencial_risco === 'CrÃ­tico' ? 'text-red-500' : 'text-zinc-300')}>
                        {report.potencial_risco || 'NÃ£o avaliado'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Agente responsÃ¡vel</label>
                <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 shadow-inner">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-black text-black shadow-lg shadow-primary/20">
                    {report.agente_nome?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-zinc-200">{report.agente_nome}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase leading-none tracking-widest text-zinc-500">{report.agente_nivel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Galeria de evidÃªncias</label>
              {isEditing && report.status === 'Aberto' ? (
                <div className="space-y-3">
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 py-6 text-zinc-600 transition-all hover:border-primary/50"
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
                      addEditingReportPhotos(Array.from(event.dataTransfer.files));
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="edit-report-photos"
                      onChange={(event) => {
                        addEditingReportPhotos(Array.from(event.target.files || []));
                        event.currentTarget.value = '';
                      }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      id="edit-report-camera"
                      onChange={(event) => {
                        addEditingReportPhotos(Array.from(event.target.files || []));
                        event.currentTarget.value = '';
                      }}
                    />
                    <div className="flex w-full flex-col items-center justify-center gap-3 text-center">
                      <Camera size={32} strokeWidth={1} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Arraste fotografias, importe da galeria ou abra a câmara</p>
                      <div className="flex w-full flex-col gap-2 sm:flex-row">
                        <label htmlFor="edit-report-photos" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-primary/50 hover:text-white">
                          <Images size={16} />
                          Importar fotografias
                        </label>
                        <label htmlFor="edit-report-camera" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15">
                          <Camera size={16} />
                          Tirar fotografia
                        </label>
                      </div>
                    </div>
                  </div>

                  {editingData.fotos.map((photo, index) => (
                    <div key={`${photo.file.name}-${index}`} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">{photo.file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingData((current: EditingReportData) => ({
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
                        placeholder="Legenda/descrição..."
                        value={photo.caption}
                        onChange={(event) =>
                          setEditingData((current: EditingReportData) => {
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
              ) : report.photos && report.photos.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {report.photos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                        <img src={photo.photo_path} alt={photo.caption || 'EvidÃªncia'} className="h-full w-full object-cover" />
                        <a
                          href={photo.photo_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Ver</span>
                        </a>
                      </div>
                      {photo.caption && <p className="text-[10px] leading-relaxed text-zinc-400">{photo.caption}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-video rounded-xl border-2 border-dashed border-zinc-800 text-zinc-600 flex flex-col items-center justify-center">
                  <Camera size={32} strokeWidth={1} />
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest">Nenhuma foto anexada</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-500">DescriÃ§Ã£o detalhada</label>
              {isEditing && report.status === 'Aberto' ? (
                <textarea
                  value={editingData.descricao}
                  onChange={(event) => setEditingData((current: EditingReportData) => ({ ...current, descricao: event.target.value }))}
                  className="min-h-[120px] w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300 focus:border-primary focus:outline-none"
                  placeholder="Edite a descriÃ§Ã£o da ocorrÃªncia..."
                />
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">{report.descricao}</div>
              )}
            </div>

            <div className="flex items-center gap-6 border-t border-zinc-800/50 pt-4">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-500" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">LAT: {report.coords_lat ? Number(report.coords_lat).toFixed(4) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-500" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">LNG: {report.coords_lng ? Number(report.coords_lng).toFixed(4) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="no-print border-t border-zinc-800 bg-zinc-900/40 p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3 sm:flex-row sm:gap-2">
              <p className="text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600 sm:text-left md:text-[10px]">Sistema de SeguranÃ§a MineGuard â€¢ Auditoria ativa</p>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="rounded-lg border border-zinc-700 bg-zinc-800 p-2.5 text-zinc-300 transition-all hover:bg-zinc-700" title="Exportar PDF">
                  <Printer size={16} />
                </button>
                <button onClick={onClose} className="rounded-lg bg-zinc-100 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-white">
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
              {isEditing && report.status === 'Aberto' ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelEditing}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:bg-zinc-700 sm:flex-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onSaveEdits}
                    className="flex-1 rounded-lg bg-blue-600 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 sm:flex-none"
                  >
                    Guardar alteraÃ§Ãµes
                  </button>
                </>
              ) : (
                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap">
                  {report.status === 'Aberto' && (
                    <button
                      type="button"
                      onClick={onStartEditing}
                      className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                    >
                      Editar
                    </button>
                  )}
                  {report.status !== 'Aprovado' && (report.status !== 'ConcluÃ­do' || currentUser?.permissions?.conclude_reports) && (
                    <button
                      onClick={() => onConclude(report.id, report.status || 'Aberto')}
                      className={cn(
                        'flex min-w-[120px] items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all',
                        report.status === 'ConcluÃ­do'
                          ? 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-green-600 text-white shadow-lg shadow-green-900/20 hover:bg-green-500'
                      )}
                    >
                      {report.status === 'ConcluÃ­do' ? (
                        <>
                          <Clock size={14} />
                          Reabrir
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Concluir
                        </>
                      )}
                    </button>
                  )}

                  {report.status !== 'Aprovado' && report.status === 'ConcluÃ­do' && currentUser?.permissions?.approve_reports && (
                    <button
                      onClick={() => onApprove(report.id)}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500"
                    >
                      <Shield size={14} />
                      Aprovar
                    </button>
                  )}

                  {(String(currentUser?.nivel_hierarquico).toLowerCase() === 'superadmin' ||
                    String(currentUser?.nivel_hierarquico).toLowerCase() === 'admin' ||
                    currentUser?.permissions?.delete_reports ||
                    currentUser?.id === 1) && (
                    <button
                      onClick={() => onDelete(report.id)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-600/10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

