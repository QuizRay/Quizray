import React from 'react';
import { Clock, HelpCircle, ArrowRight, Star } from 'lucide-react';
import type { TestItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface TestCardProps {
  test: TestItem;
  onStartTest?: (test: TestItem) => void;
}

export const TestCard: React.FC<TestCardProps> = ({ test, onStartTest }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between">
      <div>
        {/* Category and Difficulty row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-[#2563EB] bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/60">
            {test.categoryName}
          </span>
          <Badge variant="difficulty" difficulty={test.difficulty} size="sm">
            {test.difficulty}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-[#0B132B] hover:text-[#2563EB] transition-colors line-clamp-1">
          {test.title}
        </h3>

        {/* Meta details: Questions, Time, Rating */}
        <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{test.questionCount} Questions</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{test.durationMinutes} Minutes</span>
          </div>

          <div className="flex items-center gap-1 text-amber-700 font-semibold ml-auto">
            <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
            <span>{test.rating}</span>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          {test.totalAttempts.toLocaleString()}+ attempts
        </span>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onStartTest?.(test)}
          className="shadow-2xs"
        >
          <span>Start Test</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
