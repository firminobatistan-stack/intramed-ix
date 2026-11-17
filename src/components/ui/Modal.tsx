import React, { useEffect } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  if (!isOpen) return null;

  const maxWidthClass =
    size === 'xl'
      ? 'sm:max-w-4xl'
      : size === 'lg'
      ? 'sm:max-w-2xl'
      : 'sm:max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-blue-dark/40 backdrop-blur-[2px] transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${maxWidthClass} max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl border border-brand-surface-border shadow-xl overflow-hidden animate-in fade-in duration-150`}
      >
        <div className="shrink-0 flex items-start justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 border-b border-brand-surface-border">
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
            className="shrink-0 p-2 -mr-1 rounded-xl text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-surface-muted transition-colors touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-5 py-3 bg-brand-surface-muted border-t border-brand-surface-border flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
