import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface QuizTimerProps {
  remainingSeconds: number;
  totalAllocatedSeconds: number;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({
  remainingSeconds,
  totalAllocatedSeconds,
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const percentageRemaining =
    totalAllocatedSeconds > 0 ? (remainingSeconds / totalAllocatedSeconds) * 100 : 0;

  const isLowTime = percentageRemaining <= 20 || remainingSeconds <= 120;
  const isUrgent = remainingSeconds <= 60;

  let colorClasses = 'bg-blue-50 text-[#0B132B] border-blue-200/80';
  let iconColor = 'text-[#2563EB]';

  if (isUrgent) {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse';
    iconColor = 'text-rose-600';
  } else if (isLowTime) {
    colorClasses = 'bg-amber-50 text-amber-900 border-amber-300';
    iconColor = 'text-[#F59E0B]';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base shadow-2xs transition-colors duration-200 ${colorClasses}`}
      role="timer"
      aria-live="polite"
      aria-label={`Time remaining: ${minutes} minutes and ${seconds} seconds`}
    >
      {isUrgent ? (
        <AlertTriangle className="w-4 h-4 text-rose-600" />
      ) : (
        <Clock className={`w-4 h-4 ${iconColor}`} />
      )}
      <span className="tracking-wider">{formattedTime}</span>
    </div>
  );
};
