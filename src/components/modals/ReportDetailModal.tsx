import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle2, Clock, FileText, Images, MapPin, Printer, Shield, Trash2, XCircle } from 'lucide-react';
import { Badge } from '../ui/LayoutComponents';
import { cn } from '../../lib/utils';
import { formatDateTime } from '../../lib/datetime';
import { DynamicFieldDefinition, formatDynamicFieldValue, getDynamicFieldValues } from '../../lib/reportDynamicFields';
import { PhotoLightbox } from '../ui/PhotoLightbox';

interface ReportPhoto { id: number; photo_path: string; caption: string; }
interface ReportData {
  id: number; titulo: string; categoria: string; gravidade: string; descricao: string;
  coords_lat: number | string; coords_lng: number | string; status: string; timestamp: string;
  agente_nome: string; agente_nivel: string; setor?: string; equipamento?: string; acao_imediata?: string;
  testemunhas?: string; potencial_risco?: string; metadata?: any; photos?: ReportPhoto[];
}
interface EditingReportData {
  titulo: string; descricao: string; setor: string; equipamento: string; acao_imediata: string;
  testemunhas: string; potencial_risco: string; metadata?: any; dynamicFieldValues: Record<string, any>;
  fotos: Array<{ file: File; caption: string }>;
}
type FormItem = { id: string; label: string; type: string; scope: string; categories?: string[]; active: boolean; isDynamic: boolean; field?: DynamicFieldDefinition | null };
interface ReportDetailModalProps {
  report: ReportData | null; currentUser: any; systemSettings: Array<{ key: string; value: string }>; dynamicFields: DynamicFieldDefinition[]; formItems: FormItem[]; isEditing: boolean; editingData: EditingReportData; onClose: () => void; onStartEditing: () => void; onCancelEditing: () => void; setEditingData: React.Dispatch<React.SetStateAction<any>>; addEditingReportPhotos: (files: File[]) => void; onSaveEdits: () => void; onConclude: (id: number, status: string) => void; onApprove: (id: number) => void; onDelete: (id: number) => void;
}
const getConfiguredSectors = (settings: Array<{ key: string; value: string }>) => (settings.find((item) => item.key === 'form_sectors')?.value || '').split(',').map((sector) => sector.trim()).filter(Boolean);
const isVisible = (item: FormItem, category: string) => item.active && (item.scope === 'both' || item.scope === 'edit') && !(item.categories && item.categories.length > 0 && !item.categories.includes(category));

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, currentUser, systemSettings, formItems, isEditing, editingData, onClose, onStartEditing, onCancelEditing, setEditingData, addEditingReportPhotos, onSaveEdits, onConclude, onApprove, onDelete }) => {
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const configuredSectors = getConfiguredSectors(systemSettings);
  const reportDynamicValues = getDynamicFieldValues(report?.metadata);
  const visibleItems = report ? formItems.filter((item) => isVisible(item, report.categoria)) : [];
  const reportPhotoItems = useMemo(() => (report?.photos || []).map((photo) => ({ src: photo.photo_path, alt: photo.caption || 'Evidência', caption: photo.caption || '' })), [report?.photos]);
  if (!report) return null;

  const renderDynamicInput = (field: DynamicFieldDefinition) => {
    const value = editingData.dynamicFieldValues?.[field.id];
    const setValue = (next: any) => setEditingData((current: EditingReportData) => ({ ...current, dynamicFieldValues: { ...current.dynamicFieldValues, [field.id]: next } }));
    if (field.type === 'textarea') return <textarea value={value || ''} onChange={(e) => setValue(e.target.value)} className="min-h-[96px] w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300 focus:border-primary focus:outline-none" />;
    if (field.type === 'select') return <select value={value || ''} onChange={(e) => setValue(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"><option value="">Selecione...</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    if (field.type === 'multiselect') { const selectedValues = Array.isArray(value) ? value : []; return <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">{(field.options || []).map((option) => { const selected = selectedValues.includes(option); return <button key={option} type="button" onClick={() => setValue(selected ? selectedValues.filter((item) => item !== option) : [...selectedValues, option])} className={cn('rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all', selected ? 'border-primary/50 bg-primary/15 text-primary' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200')}>{option}</button>; })}</div>; }
    if (field.type === 'checkbox') return <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"><input type="checkbox" checked={Boolean(value)} onChange={(e) => setValue(e.target.checked)} className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/20" /><span className="text-sm font-bold text-zinc-300">{field.placeholder || field.label}</span></label>;
    return <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={value || ''} onChange={(e) => setValue(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" />;
  };

  const photoCard = (photo: { src: string; alt: string; caption?: string }, index: number) => (
    <button key={`${photo.src}-${index}`} type="button" onClick={() => setPhotoViewerIndex(index)} className="group space-y-2 text-left">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">Visualizar</span>
        </div>
      </div>
      {photo.caption && <p className="text-[10px] text-zinc-400">{photo.caption}</p>}
    </button>
  );

  const renderPhotoEditor = () => (
    <div className="space-y-3">
      <div className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 py-6 text-zinc-600 transition-all hover:border-primary/50">
        <input type="file" accept="image/*" multiple className="hidden" id="edit-report-photos" onChange={(event) => { addEditingReportPhotos(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} />
        <input type="file" accept="image/*" capture="environment" className="hidden" id="edit-report-camera" onChange={(event) => { addEditingReportPhotos(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} />
        <div className="flex w-full flex-col items-center justify-center gap-3 px-4 text-center">
          <Camera size={28} strokeWidth={1} />
          <p className="text-[10px] font-bold uppercase tracking-widest">Arraste fotografias, importe da galeria ou abra a câmara</p>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <label htmlFor="edit-report-photos" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-primary/50 hover:text-white"><Images size={16} />Importar fotografias</label>
            <label htmlFor="edit-report-camera" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/15"><Camera size={16} />Tirar fotografia</label>
          </div>
        </div>
      </div>
      {editingData.fotos.map((photo, index) => <div key={`${photo.file.name}-${index}`} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-zinc-300">{photo.file.name}</span><button type="button" onClick={() => setEditingData((c: EditingReportData) => ({ ...c, fotos: c.fotos.filter((_, photoIndex) => photoIndex !== index) }))} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400">Remover</button></div><input type="text" placeholder="Legenda/descrição..." value={photo.caption} onChange={(event) => setEditingData((c: EditingReportData) => { const next = [...c.fotos]; next[index] = { ...next[index], caption: event.target.value }; return { ...c, fotos: next }; })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:border-primary focus:outline-none" /></div>)}
      {reportPhotoItems.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{reportPhotoItems.map(photoCard)}</div>}
    </div>
  );

  const renderField = (item: FormItem) => {
    if (item.id === 'base:photos') {
      return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Galeria de evidências</label>{isEditing && report.status === 'Aberto' ? renderPhotoEditor() : reportPhotoItems.length > 0 ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{reportPhotoItems.map(photoCard)}</div> : <div className="rounded-xl border-2 border-dashed border-zinc-800 p-6 text-center text-zinc-600">Nenhuma fotografia anexada</div>}</div>;
    }
    if (item.isDynamic && item.field) return <div key={item.id} className={cn('space-y-2', (item.type === 'textarea' || item.type === 'multiselect' || item.type === 'checkbox') && 'md:col-span-2')}><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</label>{isEditing ? renderDynamicInput(item.field) : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{formatDynamicFieldValue(item.field, reportDynamicValues[item.field.id]) || 'N/A'}</div>}</div>;
    const viewValue = (() => {
      switch (item.id) {
        case 'base:title': return report.titulo || 'Sem título';
        case 'base:category': return report.categoria;
        case 'base:severity': return report.gravidade;
        case 'base:description': return report.descricao;
        case 'base:safety_incident': return report.metadata?.incidentType || 'N/A';
        case 'base:safety_ppe': return report.metadata?.ppeUsage || 'N/A';
        case 'base:sector': return report.setor || 'N/A';
        case 'base:people': return report.metadata?.pessoas_envolvidas || report['pessoas_envolvidas'] || 'N/A';
        case 'base:equipment': return report.equipamento || 'N/A';
        case 'base:risk': return report.potencial_risco || 'Não avaliado';
        case 'base:witnesses': return report.testemunhas || 'Nenhuma';
        case 'base:immediate_action': return report.acao_imediata || 'Nenhuma ação registada';
        case 'base:investigation': return report.metadata?.requer_investigacao || report['requer_investigacao'] ? 'Sim' : 'Não';
        default: return 'N/A';
      }
    })();
    switch (item.id) {
      case 'base:title':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Título</label>{isEditing ? <input type="text" value={editingData.titulo} onChange={(e) => setEditingData((c: EditingReportData) => ({ ...c, titulo: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{viewValue}</div>}</div>;
      case 'base:description':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Descrição detalhada</label>{isEditing ? <textarea value={editingData.descricao} onChange={(e) => setEditingData((c: EditingReportData) => ({ ...c, descricao: e.target.value }))} className="min-h-[120px] w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300 focus:border-primary focus:outline-none" /> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">{viewValue}</div>}</div>;
      case 'base:category':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoria</label><div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{viewValue}</div></div>;
      case 'base:severity':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gravidade</label><div><Badge gravidade={report.gravidade as any} /></div></div>;
      case 'base:sector':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Setor / local</label>{isEditing ? <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">{configuredSectors.map((sector) => { const selected = editingData.setor ? editingData.setor.split(', ').includes(sector) : false; return <button key={sector} type="button" onClick={() => { const selectedItems = editingData.setor ? editingData.setor.split(', ').filter(Boolean) : []; const next = selected ? selectedItems.filter((item) => item !== sector) : [...selectedItems, sector]; setEditingData((c: EditingReportData) => ({ ...c, setor: next.join(', ') })); }} className={cn('rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all', selected ? 'border-primary/50 bg-primary/15 text-primary' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200')}>{sector}</button>; })}</div> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{viewValue}</div>}</div>;
      case 'base:equipment':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Equipamento</label>{isEditing ? <input type="text" value={editingData.equipamento} onChange={(e) => setEditingData((c: EditingReportData) => ({ ...c, equipamento: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{viewValue}</div>}</div>;
      case 'base:risk':
        return <div key={item.id} className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Potencial de risco</label>{isEditing ? <select value={editingData.potencial_risco} onChange={(e) => setEditingData((c: EditingReportData) => ({ ...c, potencial_risco: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none"><option value="">Selecione...</option><option value="Baixo">Baixo</option><option value="Médio">Médio</option><option value="Alto">Alto</option><option value="Crítico">Crítico</option></select> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{viewValue}</div>}</div>;
      case 'base:witnesses':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Testemunhas</label>{isEditing ? <input type="text" value={editingData.testemunhas} onChange={(e) => setEditingData((c: EditingReportData) => ({ ...c, testemunhas: e.target.value }))} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm focus:border-primary focus:outline-none" /> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{viewValue}</div>}</div>;
      case 'base:immediate_action':
        return <div key={item.id} className="space-y-2 md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ação imediata tomada</label>{isEditing ? <textarea value={editingData.acao_imediata} onChange={(e) => setEditingData((c: EditingReportData) => ({ ...c, acao_imediata: e.target.value }))} className="min-h-[96px] w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300 focus:border-primary focus:outline-none" /> : <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">{viewValue}</div>}</div>;
      default:
        return <div key={item.id} className={cn('space-y-2', item.type === 'checkbox' && 'md:col-span-2')}><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</label><div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">{viewValue}</div></div>;
    }
  };

  return <>
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-0 backdrop-blur-xl no-print md:p-4">
      <motion.div initial={{ opacity: 0, y: 50, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.98 }} className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden border-zinc-800 bg-[linear-gradient(180deg,rgba(17,18,22,0.98),rgba(9,9,11,0.98))] shadow-2xl md:h-[90vh] md:rounded-[2rem] md:border">
        <div className="flex items-center justify-between border-b border-zinc-800/70 bg-zinc-950/60 px-5 py-5 md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText size={20} /></div>
            <div><h3 className="text-xl font-black uppercase tracking-tight">Detalhes da ocorrência</h3><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ID #{report.id} • {formatDateTime(report.timestamp, 'pt')}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {report.status === 'Concluído' && <div className="hidden items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 md:flex"><CheckCircle2 size={12} className="text-green-500" /><span className="text-[9px] font-black uppercase tracking-widest text-green-500">Relatório selado</span></div>}
            <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-white"><XCircle size={24} /></button>
          </div>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 md:max-h-[80vh]">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{visibleItems.map(renderField)}</div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Agente responsável</p><div className="mt-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-black text-black">{report.agente_nome?.charAt(0) || '?'}</div><div><p className="text-xs font-black uppercase text-zinc-200">{report.agente_nome}</p><p className="text-[10px] uppercase tracking-widest text-zinc-500">{report.agente_nivel}</p></div></div></div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"><div className="flex items-center gap-2 text-zinc-500"><MapPin size={14} /><span className="text-[10px] uppercase tracking-widest">LAT: {report.coords_lat ? Number(report.coords_lat).toFixed(4) : 'N/A'}</span></div><div className="mt-2 flex items-center gap-2 text-zinc-500"><MapPin size={14} /><span className="text-[10px] uppercase tracking-widest">LNG: {report.coords_lng ? Number(report.coords_lng).toFixed(4) : 'N/A'}</span></div></div>
            </div>
          </div>
        </div>
        <div className="no-print border-t border-zinc-800 bg-zinc-900/40 p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-3 sm:flex-row">
              <p className="text-center text-[9px] font-bold uppercase tracking-widest text-zinc-600 sm:text-left md:text-[10px]">Sistema de Segurança MineGuard • Auditoria ativa</p>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="rounded-lg border border-zinc-700 bg-zinc-800 p-2.5 text-zinc-300 transition-all hover:bg-zinc-700" title="Exportar PDF"><Printer size={16} /></button>
                <button onClick={onClose} className="rounded-lg bg-zinc-100 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-white">Fechar</button>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
              {isEditing && report.status === 'Aberto' ? <><button type="button" onClick={onCancelEditing} className="rounded-lg border border-zinc-700 bg-zinc-800 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:bg-zinc-700">Cancelar</button><button type="button" onClick={onSaveEdits} className="rounded-lg bg-blue-600 px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500">Guardar alterações</button></> : <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap">{report.status === 'Aberto' && <button type="button" onClick={onStartEditing} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-primary/90">Editar</button>}{report.status !== 'Aprovado' && (report.status !== 'Concluído' || currentUser?.permissions?.conclude_reports) && <button onClick={() => onConclude(report.id, report.status || 'Aberto')} className={cn('flex min-w-[120px] items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all', report.status === 'Concluído' ? 'border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-green-600 text-white hover:bg-green-500')}>{report.status === 'Concluído' ? <><Clock size={14} />Reabrir</> : <><CheckCircle2 size={14} />Concluir</>}</button>}{report.status !== 'Aprovado' && report.status === 'Concluído' && currentUser?.permissions?.approve_reports && <button onClick={() => onApprove(report.id)} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500"><Shield size={14} />Aprovar</button>}{(String(currentUser?.nivel_hierarquico).toLowerCase() === 'superadmin' || String(currentUser?.nivel_hierarquico).toLowerCase() === 'admin' || currentUser?.permissions?.delete_reports || currentUser?.id === 1) && <button onClick={() => onDelete(report.id)} className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-600/10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-600 hover:text-white"><Trash2 size={14} />Eliminar</button>}</div>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    <PhotoLightbox isOpen={photoViewerIndex !== null} items={reportPhotoItems} activeIndex={photoViewerIndex ?? 0} onClose={() => setPhotoViewerIndex(null)} onChangeIndex={(nextIndex) => setPhotoViewerIndex(nextIndex)} />
  </>;
};
