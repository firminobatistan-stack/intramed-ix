import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl touch-manipulation select-none transition-[transform,background-color,box-shadow,color,border-color,opacity] duration-[150ms] ease-emil-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-55 disabled:pointer-events-none';

  const variantStyles = {
    primary:
      'bg-brand-blue text-white can-hover:hover:bg-brand-blue-medium shadow-[0_1px_2px_rgba(9,24,52,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]',
    secondary:
      'bg-brand-surface-muted text-brand-text-primary shadow-[0_0_0_1px_rgba(15,42,86,0.08),0_1px_2px_rgba(15,42,86,0.03)] can-hover:hover:bg-brand-blue-light/60',
    outline:
      'bg-transparent text-brand-blue border border-brand-blue/25 can-hover:hover:border-brand-blue can-hover:hover:bg-brand-blue-light/40',
    ghost:
      'bg-transparent text-brand-text-secondary can-hover:hover:text-brand-text-primary can-hover:hover:bg-brand-surface-muted',
    accent:
      'bg-brand-yellow text-brand-blue-dark font-semibold can-hover:hover:bg-brand-yellow-dark/90 shadow-[0_1px_2px_rgba(15,42,86,0.12),inset_0_1px_0_rgba(255,255,255,0.35)]',
    danger:
      'bg-rose-600 text-white font-semibold can-hover:hover:bg-rose-700 shadow-[0_1px_2px_rgba(159,18,57,0.22),inset_0_1px_0_rgba(255,255,255,0.15)]',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-3.5 min-h-[48px] gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
