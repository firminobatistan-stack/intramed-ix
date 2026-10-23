import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
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
      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-brand-surface-border shadow-xl overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-brand-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-brand-yellow" aria-hidden="true" />
              <h2 id="modal-title" className="text-base font-display font-bold text-brand-text-primary">
                {title}
              </h2>
            </div>
            {description && (
              <p className="mt-1 text-xs text-brand-text-secondary">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-2 -mr-1 rounded-xl text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-surface-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 bg-brand-surface-muted border-t border-brand-surface-border flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
