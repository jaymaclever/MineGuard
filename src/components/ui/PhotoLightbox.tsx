import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, XCircle } from 'lucide-react';

export interface PhotoLightboxItem {
  src: string;
  alt: string;
  caption?: string;
}

interface PhotoLightboxProps {
  isOpen: boolean;
  items: PhotoLightboxItem[];
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  isOpen,
  items,
  activeIndex,
  onClose,
  onChangeIndex,
}) => {
  const activeItem = items[activeIndex];
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && items.length > 1) {
        onChangeIndex((activeIndex - 1 + items.length) % items.length);
      }
      if (event.key === 'ArrowRight' && items.length > 1) {
        onChangeIndex((activeIndex + 1) % items.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, isOpen, items.length, onChangeIndex, onClose]);

  if (!isOpen || !activeItem) return null;

  const downloadPhoto = () => {
    const anchor = document.createElement('a');
    anchor.href = activeItem.src;
    anchor.download = `${activeItem.alt || 'fotografia'}.jpg`;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const goToPrevious = () => onChangeIndex((activeIndex - 1 + items.length) % items.length);
  const goToNext = () => onChangeIndex((activeIndex + 1) % items.length);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = (event.touches[0]?.clientX ?? 0) - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (items.length <= 1) return;
    if (touchDeltaX.current <= -60) goToNext();
    if (touchDeltaX.current >= 60) goToPrevious();
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <motion.div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/95 p-3 backdrop-blur-xl sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950 shadow-2xl"
        initial={{ opacity: 0, scale: 0.97, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 18 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-900/80 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Galeria da ocorrência</p>
            <p className="truncate text-sm font-semibold text-zinc-100">{activeItem.alt}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadPhoto}
              className="hidden items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-200 transition-colors hover:border-primary/50 hover:text-primary sm:flex"
            >
              <Download size={14} />
              Descarregar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-zinc-500 transition-colors hover:text-white"
              aria-label="Fechar visualizador"
            >
              <XCircle size={26} />
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center bg-black px-3 py-4 sm:px-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {items.length > 1 && (
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-950/85 p-3 text-zinc-200 backdrop-blur transition-colors hover:border-primary/50 hover:text-primary sm:block"
              aria-label="Fotografia anterior"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <div className="flex max-h-[70vh] w-full items-center justify-center overflow-hidden rounded-[1.35rem] border border-zinc-800 bg-zinc-900/30">
              <img
                src={activeItem.src}
                alt={activeItem.alt}
                className="max-h-[70vh] w-full object-contain select-none"
                draggable={false}
              />
            </div>
            {activeItem.caption && <p className="max-w-3xl text-center text-sm text-zinc-300">{activeItem.caption}</p>}
          </div>

          {items.length > 1 && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-950/85 p-3 text-zinc-200 backdrop-blur transition-colors hover:border-primary/50 hover:text-primary sm:block"
              aria-label="Próxima fotografia"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        <div className="border-t border-zinc-800/80 bg-zinc-900/80 px-4 py-3 sm:px-5 sm:py-4">
          {items.length > 1 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {items.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={`${item.src}-${index}`}
                    type="button"
                    onClick={() => onChangeIndex(index)}
                    className={`group relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl border transition-all ${
                      isActive ? 'border-primary shadow-[0_0_0_1px_rgba(249,115,22,0.4)]' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                    aria-label={`Abrir fotografia ${index + 1}`}
                  >
                    <img src={item.src} alt={item.alt} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <div className={`absolute inset-0 ${isActive ? 'bg-primary/10' : 'bg-black/20'}`} />
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            <span>
              {activeIndex + 1} / {items.length}
            </span>
            <span className="sm:hidden">{items.length > 1 ? 'Deslize para trocar' : 'Toque em fechar para sair'}</span>
            <span className="hidden sm:inline">{items.length > 1 ? 'Use ← → ou clique nas miniaturas' : 'Fotografia única'}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
