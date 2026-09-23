import React from 'react';
import { POPULAR_TESTS } from '../../data/mockData';
import { TestCard } from './TestCard';
import type { TestItem } from '../../types';

interface PopularTestsSectionProps {
  onSelectTest?: (testId: string) => void;
}

export const PopularTestsSection: React.FC<PopularTestsSectionProps> = ({ onSelectTest }) => {
  const handleStartTest = (test: TestItem) => {
    if (onSelectTest) {
      onSelectTest(test.id);
    } else {
      window.location.hash = `#/test/${test.id}/instructions`;
    }
  };

  return (
    <section id="tests" className="py-16 md:py-24 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
              <span>Ready-To-Take Assessments</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
              Popular Tests
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl">
              High-yield curated practice quizzes with full timing benchmarks, adaptive scoring, and topic insights.
            </p>
          </div>
        </div>

        {/* 4 Sample Test Cards in Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {POPULAR_TESTS.map((test) => (
            <TestCard key={test.id} test={test} onStartTest={handleStartTest} />
          ))}
        </div>
      </div>
    </section>
  );
};
