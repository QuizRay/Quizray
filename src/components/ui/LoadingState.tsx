import React from 'react';

interface LoadingStateProps {
  message?: string;
  minHeight?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading assessment data...',
  minHeight = 'min-h-[300px]',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${minHeight}`}>
      <div className="relative flex items-center justify-center mb-4">
        {/* Outer pulsating ring */}
        <div className="w-12 h-12 rounded-full border-4 border-[#2563EB]/20 border-t-[#2563EB] animate-spin" />
        <div className="absolute w-6 h-6 rounded-full bg-blue-50 border border-blue-200" />
      </div>
      <p className="text-sm font-semibold text-[#0B132B]">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Please wait a moment</p>
    </div>
  );
};
