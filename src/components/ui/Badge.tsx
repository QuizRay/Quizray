import React from 'react';
import type { DifficultyLevel } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'electric' | 'gold' | 'midnight' | 'difficulty';
  difficulty?: DifficultyLevel;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  difficulty,
  size = 'md',
  className = '',
}) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (variant === 'electric') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/80';
  } else if (variant === 'gold') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80';
  } else if (variant === 'midnight') {
    colorClasses = 'bg-[#0B132B]/5 text-[#0B132B] border-[#0B132B]/15';
  } else if (variant === 'difficulty' && difficulty) {
    switch (difficulty) {
      case 'Beginner':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
        break;
      case 'Intermediate':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80';
        break;
      case 'Advanced':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
        break;
    }
  }

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colorClasses} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
};
