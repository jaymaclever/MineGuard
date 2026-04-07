import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';

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

  return (
    <motion.div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[1.75rem] border border-zinc-800 bg-zinc-950 shadow-2xl"
        initial={{ opacity: 0, scale: 0.97, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 18 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/70 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Visualização da fotografia</p>
            <p className="truncate text-sm font-semibold text-zinc-200">{activeItem.alt}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 transition-colors hover:text-white"
            aria-label="Fechar visualizador"
          >
            <XCircle size={26} />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-4">
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onChangeIndex((activeIndex - 1 + items.length) % items.length)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-950/80 p-3 text-zinc-200 backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
              aria-label="Fotografia anterior"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <div className="flex max-h-[72vh] w-full items-center justify-center overflow-hidden rounded-[1.35rem] border border-zinc-800 bg-zinc-900/40">
              <img
                src={activeItem.src}
                alt={activeItem.alt}
                className="max-h-[72vh] w-full object-contain"
                draggable={false}
              />
            </div>
            {activeItem.caption && (
              <p className="max-w-3xl text-center text-sm text-zinc-400">{activeItem.caption}</p>
            )}
          </div>

          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onChangeIndex((activeIndex + 1) % items.length)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-700 bg-zinc-950/80 p-3 text-zinc-200 backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
              aria-label="Próxima fotografia"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        <div className="border-t border-zinc-800/80 bg-zinc-900/70 px-5 py-4">
          <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            <span>
              {activeIndex + 1} / {items.length}
            </span>
            <span>Use ← → e Esc</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
