import React, { type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'gold' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm hover:shadow-md hover:shadow-blue-500/10 focus-visible:ring-[#2563EB]',
    secondary:
      'bg-[#0B132B] text-white hover:bg-[#1C2541] shadow-sm hover:shadow-md focus-visible:ring-[#0B132B]',
    outline:
      'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-400 shadow-xs',
    gold:
      'bg-[#F59E0B] text-slate-950 hover:bg-[#D97706] shadow-sm hover:shadow-md hover:shadow-amber-500/10 focus-visible:ring-[#F59E0B] font-bold',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 focus-visible:ring-slate-300',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3.5 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-6 py-3.5 min-h-[48px] gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
