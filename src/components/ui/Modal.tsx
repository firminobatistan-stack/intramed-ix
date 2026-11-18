import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [dataState, setDataState] = useState<'entering' | 'open' | 'closed'>(
    isOpen ? 'open' : 'closed'
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number | null;
    startY: number;
    lastY: number;
    startTime: number;
    isDragging: boolean;
  }>({
    pointerId: null,
    startY: 0,
    lastY: 0,
    startTime: 0,
    isDragging: false,
  });

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    if (isOpen) {
      setShouldRender(true);
      setDataState('entering');
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (panelRef.current) {
            panelRef.current.style.transform = '';
            panelRef.current.style.transition = '';
          }
          if (backdropRef.current) {
            backdropRef.current.style.opacity = '';
          }
          setDataState('open');
        });
      });
    } else if (shouldRender) {
      setDataState('closed');
      closeTimer = setTimeout(() => {
        setShouldRender(false);
      }, 210);
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const maxWidthClass =
    size === 'xl'
      ? 'sm:max-w-4xl'
      : size === 'lg'
      ? 'sm:max-w-2xl'
      : 'sm:max-w-md';

  // Vaul-inspired 1:1 touch drag-to-dismiss on mobile bottom-sheet header
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 640) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (dragStateRef.current.isDragging) return; // Multi-touch protection

    dragStateRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      startTime: performance.now(),
      isDragging: true,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (panelRef.current) {
      panelRef.current.style.transition = 'none';
    }
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st.isDragging || st.pointerId !== e.pointerId || !panelRef.current) return;

    const rawDy = e.clientY - st.startY;
    st.lastY = e.clientY;

    // Rubber-band damping when pulling upward past natural top boundary
    const dampedY =
      rawDy >= 0 ? rawDy : -Math.sqrt(Math.abs(rawDy)) * 3.2;

    panelRef.current.style.transform = `translate3d(0, ${dampedY}px, 0)`;

    if (backdropRef.current && rawDy > 0) {
      const progress = Math.min(1, rawDy / 320);
      backdropRef.current.style.opacity = String(Math.max(0.15, 1 - progress * 0.75));
    }
  };

  const finishHeaderDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st.isDragging || st.pointerId !== e.pointerId) return;

    const dy = st.lastY - st.startY;
    const elapsed = Math.max(1, performance.now() - st.startTime);
    const velocity = dy / elapsed; // px/ms — Emil Kowalski momentum threshold ~0.11

    st.isDragging = false;
    st.pointerId = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (panelRef.current) {
      panelRef.current.style.transition = '';
    }
    if (backdropRef.current) {
      backdropRef.current.style.opacity = '';
    }

    if (dy >= 88 || velocity > 0.11) {
      if (panelRef.current) {
        panelRef.current.style.transform = 'translate3d(0, 100%, 0)';
      }
      onClose();
    } else if (panelRef.current) {
      panelRef.current.style.transform = '';
    }
  };

  const stateAttr = dataState === 'open' ? 'open' : dataState === 'closed' ? 'closed' : 'entering';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={backdropRef}
        data-state={stateAttr}
        className="emil-backdrop fixed inset-0 bg-brand-blue-dark/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        data-state={stateAttr}
        className={`emil-sheet-panel relative z-10 w-full ${maxWidthClass} max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-[24px] sm:rounded-[24px] shadow-elevated overflow-hidden`}
      >
        <div
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={finishHeaderDrag}
          onPointerCancel={finishHeaderDrag}
          className="shrink-0 px-4 sm:px-5 pt-2.5 sm:pt-5 pb-3.5 border-b border-brand-surface-border/80 sm:touch-auto touch-none cursor-grab active:cursor-grabbing sm:cursor-default"
        >
          {/* Pílula física de arraste estilo iOS / Vaul no Bottom Sheet Mobile */}
          <div className="sm:hidden flex justify-center pb-2.5" aria-hidden="true">
            <span className="w-10 h-1 rounded-full bg-slate-300/90" />
          </div>

          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-brand-yellow shrink-0" aria-hidden="true" />
                <h2 id="modal-title" className="text-base font-display font-bold text-brand-text-primary leading-snug">
                  {title}
                </h2>
              </div>
              {description && (
                <p className="mt-1 text-xs text-brand-text-secondary leading-relaxed">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar janela"
              className="shrink-0 p-2 -mr-1 rounded-xl text-brand-text-secondary can-hover:hover:text-brand-text-primary can-hover:hover:bg-brand-surface-muted transition-[transform,color,background-color] duration-[150ms] ease-emil-out active:scale-[0.95] touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),12px)] sm:pb-3 bg-brand-surface-muted border-t border-brand-surface-border/80 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
