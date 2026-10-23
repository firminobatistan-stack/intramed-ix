import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
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
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none select-none';

  const variantStyles = {
    primary:
      'bg-brand-blue text-white hover:bg-brand-blue-medium shadow-sm',
    secondary:
      'bg-brand-surface-muted text-brand-text-primary border border-brand-surface-border hover:bg-brand-blue-light/60',
    outline:
      'bg-transparent text-brand-blue border border-brand-blue/25 hover:border-brand-blue hover:bg-brand-blue-light/40',
    ghost:
      'bg-transparent text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-surface-muted',
    accent:
      'bg-brand-yellow text-brand-blue-dark font-semibold hover:bg-brand-yellow-dark/90 shadow-sm',
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
