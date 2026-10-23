import React from 'react';
import { ModalityIconKey } from '../../types/domain';

interface SportIconProps {
  iconKey: ModalityIconKey;
  className?: string;
}

/**
 * Ícones esportivos vetoriais minimalistas para cada modalidade oficial do INTRAMED IX.
 */
export const SportIcon: React.FC<SportIconProps> = ({ iconKey, className = 'w-6 h-6' }) => {
  switch (iconKey) {
    case 'futsal':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <polygon points="12 7.5 15.8 10.2 14.3 14.6 9.7 14.6 8.2 10.2" />
          <line x1="12" y1="7.5" x2="12" y2="2.5" />
          <line x1="15.8" y1="10.2" x2="20.8" y2="8.8" />
          <line x1="14.3" y1="14.6" x2="17.8" y2="19.2" />
          <line x1="9.7" y1="14.6" x2="6.2" y2="19.2" />
          <line x1="8.2" y1="10.2" x2="3.2" y2="8.8" />
        </svg>
      );

    case 'basquete':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <line x1="2.5" y1="12" x2="21.5" y2="12" />
          <line x1="12" y1="2.5" x2="12" y2="21.5" />
          <path d="M5.3 5.3C8.5 8.5 8.5 15.5 5.3 18.7" />
          <path d="M18.7 5.3C15.5 8.5 15.5 15.5 18.7 18.7" />
        </svg>
      );

    case 'handebol':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 6.36 15.36" />
          <path d="M7.5 8.5l4.5-2.5 4.5 2.5v5l-4.5 2.5-4.5-2.5z" />
          <circle cx="12" cy="11" r="1.5" />
        </svg>
      );

    case 'volei':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 12C12 6.8 15.8 3.2 17.5 4" />
          <path d="M12 12C16.5 14.5 17.8 19.2 16.5 20.4" />
          <path d="M12 12C7.5 14.5 3.2 12.2 2.6 10.5" />
          <path d="M8.5 3.2C11.5 6 15.2 8.2 21.2 10.5" />
          <path d="M5.2 18.5C9.5 16.5 13.5 13.5 16 4" />
        </svg>
      );

    case 'volei-de-praia':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="9.5" r="6.5" />
          <path d="M12 9.5C12 5.8 14.5 3.6 15.8 4.2" />
          <path d="M12 9.5C15 11.2 16 14.2 15 15.2" />
          <path d="M12 9.5C9 11.2 6.2 9.6 5.7 8.4" />
          <path d="M3 19.5c2-1.5 4.5-1.5 6.5 0s4.5 1.5 6.5 0 3.5-1.2 5 0" />
        </svg>
      );

    case 'truco':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <rect x="4" y="4" width="11" height="15" rx="2" />
          <path d="M15 7h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2" />
          <path d="M9.5 9L7.5 11.5L9.5 14L11.5 11.5L9.5 9Z" />
        </svg>
      );

    case 'sinuca':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="11" cy="13" r="7.5" />
          <circle cx="11" cy="13" r="3" />
          <line x1="17.5" y1="6.5" x2="21.5" y2="2.5" />
        </svg>
      );

    case 'natacao':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="16.5" cy="7.5" r="2.2" />
          <path d="M5 13l4.5-3.5 3.5 2.5 3-1.5" />
          <path d="M2.5 16.5c2-1.4 4.2-1.4 6.2 0s4.2 1.4 6.2 0 4.2-1.4 6.6 0" />
          <path d="M2.5 20.5c2-1.4 4.2-1.4 6.2 0s4.2 1.4 6.2 0 4.2-1.4 6.6 0" />
        </svg>
      );

    case 'poker':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="12" r="6" strokeDasharray="3 2.5" />
          <path d="M12 8.5C12 8.5 9 11.2 9 13a2 2 0 0 0 3 1.7A2 2 0 0 0 15 13c0-1.8-3-4.5-3-4.5z" />
          <line x1="12" y1="14.7" x2="12" y2="16.2" />
        </svg>
      );

    case 'tenis-de-mesa':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M13.5 15.5a6.5 6.5 0 1 0-9-9 6.5 6.5 0 0 0 9 9z" />
          <path d="M13.5 15.5L18.5 20.5" strokeWidth="2.2" />
          <line x1="6.5" y1="14.5" x2="14.5" y2="6.5" />
          <circle cx="19" cy="6" r="2.2" />
        </svg>
      );
  }
};
