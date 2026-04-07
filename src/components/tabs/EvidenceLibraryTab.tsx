import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Image as ImageIcon, Layers3 } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { PhotoLightbox, PhotoLightboxItem } from '../ui/PhotoLightbox';
import { Report } from '../../types';

interface EvidenceLibraryTabProps {
  reports: Report[];
  onOpenReportDetails: (report: Report) => void;
}

export const EvidenceLibraryTab: React.FC<EvidenceLibraryTabProps> = ({ reports, onOpenReportDetails }) => {
  const [galleryReport, setGalleryReport] = useState<Report | null>(null);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);

  const reportsWithPhotos = reports.filter((report) => Array.isArray(report.photos) && report.photos.length > 0);

  const galleryItems = useMemo<PhotoLightboxItem[]>(
    () =>
      (galleryReport?.photos ?? []).map((photo, index) => ({
        src: photo.photo_path,
        alt: photo.caption || `${galleryReport?.titulo || 'Ocorrência'} ${index + 1}`,
        caption: photo.caption || undefined,
      })),
    [galleryReport],
  );

  const openGallery = (report: Report, index = 0) => {
    setGalleryReport(report);
    setPhotoViewerIndex(index);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Biblioteca de Evidências</h2>
          <p className="mt-2 text-sm text-zinc-500">Galeria operacional das fotografias anexadas às ocorrências, pronta para consulta rápida.</p>
        </div>

        {reportsWithPhotos.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <Camera className="mx-auto text-zinc-800" size={48} />
              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-zinc-500">Sem evidências carregadas</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {reportsWithPhotos.map((report) => {
              const cover = report.photos?.[0];
              return (
                <article
                  key={report.id}
                  className="overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-950/70 text-left transition-all hover:border-primary/30 hover:bg-zinc-900/90"
                >
                  <button type="button" onClick={() => openGallery(report)} className="block w-full text-left">
                    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-950">
                      {cover ? (
                        <img
                          src={cover.photo_path}
                          alt={cover.caption || report.titulo || 'Evidência'}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon size={36} className="text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                          <Camera size={12} />
                          {report.photos?.length || 0} ficheiro(s)
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="space-y-3 p-5">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-white">{report.titulo || 'Sem título'}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {report.agente_nome} • {report.categoria}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-sm text-zinc-400">{report.descricao}</p>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                        {new Date(report.timestamp).toLocaleDateString('pt-PT')}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openGallery(report)}
                          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/15"
                        >
                          Visualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenReportDetails(report)}
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                        >
                          <Layers3 size={12} />
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </motion.div>

      <PhotoLightbox
        isOpen={photoViewerIndex !== null}
        items={galleryItems}
        activeIndex={photoViewerIndex ?? 0}
        onClose={() => {
          setPhotoViewerIndex(null);
          setGalleryReport(null);
        }}
        onChangeIndex={(nextIndex) => setPhotoViewerIndex(nextIndex)}
      />
    </>
  );
};
