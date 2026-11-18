import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-brand-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-brand-text-muted pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full min-h-[46px] bg-white text-brand-text-primary text-sm rounded-xl border shadow-[0_1px_2px_rgba(15,42,86,0.03)] transition-[border-color,box-shadow,background-color] duration-[160ms] ease-emil-out placeholder:text-brand-text-muted/80 focus:outline-none focus:ring-2 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightElement ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                : 'border-brand-surface-border/90 can-hover:hover:border-brand-blue/30 focus:border-brand-blue focus:ring-brand-blue/12'
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-brand-text-secondary">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-600 font-medium" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-brand-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
