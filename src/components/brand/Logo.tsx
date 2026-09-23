import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean;
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  inverted = false,
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { img: 'w-8 h-8', text: 'text-lg' },
    md: { img: 'w-10 h-10', text: 'text-2xl' },
    lg: { img: 'w-12 h-12', text: 'text-3xl' },
  };

  const { img, text } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Approved QuizRay Logo Asset */}
      <div
        className={`relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden ${img} ${
          inverted ? 'bg-white p-1 shadow-sm' : 'bg-transparent'
        }`}
      >
        <img
          src="/logo.png"
          alt="QuizRay Logo"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>

      {showText && (
        <span
          className={`font-extrabold tracking-tight font-['Plus_Jakarta_Sans',sans-serif] ${text} leading-none`}
        >
          <span className={inverted ? 'text-white' : 'text-[#0B132B]'}>Quiz</span>
          <span className="text-[#2563EB]">Ray</span>
        </span>
      )}
    </div>
  );
};
