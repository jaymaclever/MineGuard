import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Images, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import {
  DynamicFieldDefinition,
  formatDynamicFieldValue,
  getDynamicFieldValues,
} from '../../lib/reportDynamicFields';
import { PhotoLightbox } from '../ui/PhotoLightbox';
import { ReportParticipantsField } from '../ui/ReportParticipantsField';
import { User } from '../../types';

type NewReportPhoto = { file: File; caption: string };

type FormItem = {
  id: string;
  label: string;
  type: string;
  scope: string;
  categories?: string[];
  active: boolean;
  isDynamic: boolean;
  field?: DynamicFieldDefinition | null;
};

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
  participant_ids: number[];
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
  dynamicFields: DynamicFieldDefinition[];
  formItems: FormItem[];
  availableParticipantUsers: User[];
  currentUserId?: number;
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

const getConfiguredSectors = (settings: SettingItem[]) =>
  (settings.find((item) => item.key === 'form_sectors')?.value || '')
    .split(',')
    .map((sector) => sector.trim())
    .filter(Boolean);

const isVisible = (item: FormItem, category: string) => {
  if (!item.active) return false;
  if (!(item.scope === 'both' || item.scope === 'create')) return false;
  if (item.categories && item.categories.length > 0 && !item.categories.includes(category)) return false;
  return true;
};

export const NewReportModal: React.FC<NewReportModalProps> = ({
  isOpen,
  showPreview,
  newReport,
  systemSettings,
  formItems,
  availableParticipantUsers,
  currentUserId,
  onClose,
  onSubmit,
  onPreview,
  onClosePreview,
  onConfirmPreview,
  setNewReport,
  addNewReportPhotos,
}) => {
  const { t } = useTranslation();
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);

  const configuredSectors = getConfiguredSectors(systemSettings);
  const dynamicFieldValues = getDynamicFieldValues(newReport.metadata);
  const visibleItems = formItems.filter((item) => isVisible(item, newReport.categoria));

  const photoItems = useMemo(
    () =>
      newReport.fotos.map((photo) => ({
        src: URL.createObjectURL(photo.file),
        alt: photo.caption || photo.file.name,
        caption: photo.caption || photo.file.name,
      })),
    [newReport.fotos]
  );

  useEffect(() => {
    return () => {
      photoItems.forEach((item) => {
        if (item.src.startsWith('blob:')) URL.revokeObjectURL(item.src);
      });
    };
  }, [photoItems]);

  if (!isOpen && !showPreview) return null;

  const updateDynamicFieldValue = (fieldId: string, value: any) => {
    setNewReport((current: NewReportState) => ({
      ...current,
      metadata: {
        ...(current.metadata || {}),
        dynamicFields: {
          ...getDynamicFieldValues(current.metadata),
          [fieldId]: value,
        },
      },
    }));
  };

  const renderDynamicInput = (field: DynamicFieldDefinition) => {
    const value = dynamicFieldValues[field.id];
    if (field.type === 'textarea') return <textarea value={value || ''} required={field.required} placeholder={field.placeholder || field.label} onChange={(e) => updateDynamicFieldValue(field.id, e.target.value)} className="min-h-[96px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" />;
    if (field.type === 'select') return <select value={value || ''} required={field.required} onChange={(e) => updateDynamicFieldValue(field.id, e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"><option value="">Selecione...</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    if (field.type === 'multiselect') {
      const selectedValues = Array.isArray(value) ? value : [];
      return <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">{(field.options || []).map((option) => { const selected = selectedValues.includes(option); return <button key={option} type="button" onClick={() => updateDynamicFieldValue(field.id, selected ? selectedValues.filter((item) => item !== option) : [...selectedValues, option])} className={cn('rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all', selected ? 'border-primary/50 bg-primary/15 text-primary' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200')}>{option}</button>; })}</div>;
    }
    if (field.type === 'checkbox') return <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><input type="checkbox" checked={Boolean(value)} onChange={(e) => updateDynamicFieldValue(field.id, e.target.checked)} className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/20" /><span className="text-sm font-bold text-zinc-300">{field.placeholder || field.label}</span></label>;
    return <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={value || ''} required={field.required} placeholder={field.placeholder || field.label} onChange={(e) => updateDynamicFieldValue(field.id, e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" />;
  };

  const renderPhotosInput = () => (
    <div className="space-y-3">
      <div className="relative group" onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('border-primary/70', 'bg-primary/5'); }} onDragLeave={(event) => { event.currentTarget.classList.remove('border-primary/70', 'bg-primary/5'); }} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('border-primary/70', 'bg-primary/5'); addNewReportPhotos(Array.from(event.dataTransfer.files)); }}>
        <input type="file" accept="image/*" multiple className="hidden" id="report-photos" onChange={(event) => { addNewReportPhotos(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} />
        <input type="file" accept="image/*" capture="environment" className="hidden" id="report-camera" onChange={(event) => { addNewReportPhotos(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} />
        <div className="rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900 py-5 transition-all hover:border-primary/50 hover:bg-zinc-900/60">
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <Camera className="text-zinc-500 transition-colors group-hover:text-primary" size={24} />
            <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300">{t('app.reportModal.photos.dropzone')}</span>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <label htmlFor="report-photos" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-primary/50 hover:text-white"><Images size={16} />{t('app.reportModal.photos.import')}</label>
              <label htmlFor="report-camera" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15"><Camera size={16} />{t('app.reportModal.photos.capture')}</label>
            </div>
          </div>
        </div>
      </div>

      {newReport.fotos.length > 0 && (
        <div className="space-y-3">
          {photoItems.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photoItems.map((photo, index) => (
                <button key={`${photo.src}-${index}`} type="button" onClick={() => setPhotoViewerIndex(index)} className="group space-y-2 text-left">
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                    <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">{t('app.reportModal.actions.preview')}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400">{photo.caption}</p>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {newReport.fotos.map((photo, index) => (
              <div key={`${photo.file.name}-${index}`} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-zinc-300">{photo.file.name}</span>
                  <button type="button" onClick={() => setNewReport((current: NewReportState) => ({ ...current, fotos: current.fotos.filter((_, photoIndex) => photoIndex !== index) }))} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400">Remover</button>
                </div>
                <input type="text" placeholder={t('app.reportModal.photos.captionPlaceholder')} value={photo.caption} onChange={(event) => setNewReport((current: NewReportState) => { const updatedPhotos = [...current.fotos]; updatedPhotos[index] = { ...updatedPhotos[index], caption: event.target.value }; return { ...current, fotos: updatedPhotos }; })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:border-primary focus:outline-none" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderField = (item: FormItem) => {
    if (item.isDynamic && item.field) {
      return <div key={item.id} className={cn('space-y-2', (item.type === 'textarea' || item.type === 'multiselect' || item.type === 'checkbox') && 'md:col-span-2')}><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}{item.field.required && <span className="ml-1 text-red-400">*</span>}</label>{renderDynamicInput(item.field)}</div>;
    }
    switch (item.id) {
      case 'base:title':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('app.reportModal.fields.title')}</label><input type="text" required value={newReport.titulo} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, titulo: e.target.value }))} placeholder={t('app.reportModal.placeholders.title')} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /></div>;
      case 'base:category':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('forms.category')}</label><select value={newReport.categoria} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, categoria: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"><option value="Valores">{t('app.reportModal.categories.valuesProtection')}</option><option value="Perímetro">{t('categories.perimetro')}</option><option value="Safety">Safety (HSE)</option><option value="Operativo">{t('categories.operativo')}</option><option value="Logística">{t('categories.logistica')}</option><option value="Manutenção">{t('app.reportModal.categories.plantMaintenance')}</option><option value="Informativo">{t('categories.informativo')}</option></select></div>;
      case 'base:severity':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('forms.severity')}</label><select value={newReport.gravidade} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, gravidade: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"><option value="G1">{t('severity.G1')}</option><option value="G2">{t('severity.G2')}</option><option value="G3">{t('severity.G3')}</option><option value="G4">{t('severity.G4')}</option></select></div>;
      case 'base:description':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('app.reportModal.fields.description')}</label><textarea required value={newReport.descricao} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, descricao: e.target.value }))} placeholder={t('app.reportModal.placeholders.description')} className="min-h-[120px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /></div>;
      case 'base:safety_incident':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-orange-400">Tipo de incidente (Safety)</label><select value={newReport.metadata?.incidentType || ''} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, metadata: { ...(c.metadata || {}), incidentType: e.target.value } }))} className="w-full rounded-xl border border-orange-500/40 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"><option value="">Selecione...</option><option value="Queda">Queda de mesmo nível</option><option value="Esmagamento">Risco de esmagamento</option><option value="Quimico">Derramamento químico</option><option value="Outro">Outro</option></select></div>;
      case 'base:safety_ppe':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-orange-400">Uso de EPI</label><select value={newReport.metadata?.ppeUsage || ''} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, metadata: { ...(c.metadata || {}), ppeUsage: e.target.value } }))} className="w-full rounded-xl border border-orange-500/40 bg-zinc-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none"><option value="">Selecione...</option><option value="Total">Sim, todos adequados</option><option value="Parcial">Parcial / inadequado</option><option value="Nenhum">Não estava a usar</option></select></div>;
      case 'base:sector':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('app.reportModal.fields.sector')}</label><div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">{configuredSectors.map((sector) => { const selected = newReport.setor ? newReport.setor.split(', ').includes(sector) : false; return <button key={sector} type="button" onClick={() => { const selectedItems = newReport.setor ? newReport.setor.split(', ').filter(Boolean) : []; const next = selected ? selectedItems.filter((item) => item !== sector) : [...selectedItems, sector]; setNewReport((c: NewReportState) => ({ ...c, setor: next.join(', ') })); }} className={cn('rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all', selected ? 'border-primary/50 bg-primary/15 text-primary' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200')}>{sector}</button>; })}{configuredSectors.length === 0 && <p className="text-xs italic text-zinc-600">{t('app.reportModal.noConfiguredSector')}</p>}</div></div>;
      case 'base:people':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('app.reportModal.fields.people')}</label><input type="number" min="0" value={newReport.pessoas_envolvidas} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, pessoas_envolvidas: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /></div>;
      case 'base:equipment':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('app.reportModal.fields.equipment')}</label><input type="text" value={newReport.equipamento} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, equipamento: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /></div>;
      case 'base:risk':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('app.reportModal.fields.risk')}</label><select value={newReport.potencial_risco} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, potencial_risco: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"><option value="">{t('app.reportModal.selectPlaceholder')}</option><option value="Baixo">{t('app.reportModal.risk.low')}</option><option value="Médio">{t('app.reportModal.risk.medium')}</option><option value="Alto">{t('app.reportModal.risk.high')}</option><option value="Crítico">{t('app.reportModal.risk.critical')}</option></select></div>;
      case 'base:witnesses':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('forms.witnesses')}</label><input type="text" value={newReport.testemunhas} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, testemunhas: e.target.value }))} placeholder={t('app.reportModal.placeholders.witnesses')} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /></div>;
      case 'base:immediate_action':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('forms.immediateAction')}</label><textarea value={newReport.acao_imediata} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, acao_imediata: e.target.value }))} placeholder={t('app.reportModal.placeholders.immediateAction')} className="min-h-[96px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /></div>;
      case 'base:investigation':
        return <div key={item.id} className="md:col-span-2"><label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><input type="checkbox" checked={newReport.requer_investigacao} onChange={(e) => setNewReport((c: NewReportState) => ({ ...c, requer_investigacao: e.target.checked }))} className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/20" /><span className="text-sm font-bold text-zinc-300">{t('app.reportModal.fields.investigation')}</span></label></div>;
      case 'base:photos':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t('app.reportModal.fields.photos')}</label>{renderPhotosInput()}</div>;
      default:
        return null;
    }
  };

  const previewValue = (item: FormItem) => {
    if (item.isDynamic && item.field) return formatDynamicFieldValue(item.field, dynamicFieldValues[item.field.id]);
    switch (item.id) {
      case 'base:title': return newReport.titulo;
      case 'base:category': return newReport.categoria;
      case 'base:severity': return newReport.gravidade;
      case 'base:description': return newReport.descricao;
      case 'base:safety_incident': return newReport.metadata?.incidentType || '';
      case 'base:safety_ppe': return newReport.metadata?.ppeUsage || '';
      case 'base:sector': return newReport.setor;
      case 'base:people': return newReport.pessoas_envolvidas;
      case 'base:equipment': return newReport.equipamento;
      case 'base:risk': return newReport.potencial_risco;
      case 'base:witnesses': return newReport.testemunhas;
      case 'base:immediate_action': return newReport.acao_imediata;
      case 'base:investigation': return newReport.requer_investigacao ? t('app.reportModal.yes') : '';
      case 'base:photos': return newReport.fotos.length > 0 ? t('app.reportModal.photoCount', { count: newReport.fotos.length }) : '';
      default: return '';
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-0 backdrop-blur-md no-print md:p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden border border-zinc-800 bg-[linear-gradient(180deg,rgba(17,18,22,0.98),rgba(9,9,11,0.98))] shadow-2xl md:h-auto md:max-h-[92vh] md:rounded-[2rem]">
            <form onSubmit={onSubmit} className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-950/60 px-5 py-5 md:px-7">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{t('app.reportModal.newBadge')}</p>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white">{t('app.reportModal.newTitle')}</h3>
                </div>
                <button type="button" onClick={onClose} className="text-zinc-500 transition-colors hover:text-white"><XCircle size={24} /></button>
              </div>
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:max-h-[72vh]">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {visibleItems.map(renderField)}
                  <ReportParticipantsField
                    availableUsers={availableParticipantUsers}
                    selectedUserIds={newReport.participant_ids}
                    onChange={(participantIds) => setNewReport((c: NewReportState) => ({ ...c, participant_ids: participantIds }))}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
              <div className="no-print flex flex-col-reverse justify-end gap-3 border-t border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row md:p-6">
                <button type="button" onClick={onClose} className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-all hover:text-white sm:w-auto">{t('forms.cancel')}</button>
                <button type="button" onClick={onPreview} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-700 sm:w-auto">{t('app.reportModal.actions.preview')}</button>
                <button type="submit" className="w-full rounded-lg bg-primary px-8 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 sm:w-auto">{t('app.reportModal.actions.submit')}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/20 p-6"><h3 className="text-xl font-black uppercase tracking-tighter">{t('app.reportModal.previewTitle')}</h3><button type="button" onClick={onClosePreview} className="text-zinc-500 transition-colors hover:text-white"><XCircle size={24} /></button></div>
            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleItems.filter((item) => previewValue(item)).map((item) => <div key={`preview-${item.id}`} className={cn('space-y-2', (item.type === 'textarea' || item.type === 'multiselect' || item.type === 'checkbox' || item.id === 'base:photos') && 'sm:col-span-2')}><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</p><div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{previewValue(item)}</div></div>)}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900/20 p-6"><button type="button" onClick={onClosePreview} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">{t('app.reportModal.actions.back')}</button><button type="button" onClick={onConfirmPreview} className="rounded-lg bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">{t('app.reportModal.actions.confirmAndSend')}</button></div>
          </motion.div>
        </div>
      )}

      <PhotoLightbox
        isOpen={photoViewerIndex !== null}
        items={photoItems}
        activeIndex={photoViewerIndex ?? 0}
        onClose={() => setPhotoViewerIndex(null)}
        onChangeIndex={(nextIndex) => setPhotoViewerIndex(nextIndex)}
      />
    </>
  );
};
