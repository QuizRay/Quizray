import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: string;
  onRetry?: () => void;
  minHeight?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Database Connection Error',
  message,
  error,
  onRetry,
  minHeight = 'min-h-[300px]',
}) => {
  const displayMessage =
    error ||
    message ||
    'Failed to load content from the database. Please check your network connection or try again.';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-rose-200/80 shadow-xs max-w-lg mx-auto ${minHeight}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h3 className="text-lg font-bold text-[#0B132B]">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-sm">
        {displayMessage}
      </p>

      {onRetry && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Try Again</span>
          </Button>
        </div>
      )}
    </div>
  );
};
