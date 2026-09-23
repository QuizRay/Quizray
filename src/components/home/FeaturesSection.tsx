import React from 'react';
import { CORE_FEATURES } from '../../data/mockData';
import { FeatureCard } from './FeatureCard';

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
            <span>Why Choose QuizRay</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
            Designed for Precision & Accelerated Learning
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Every feature in QuizRay is engineered to reduce test anxiety, sharpen time management, and accelerate subject mastery.
          </p>
        </div>

        {/* 4 Core Features in Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CORE_FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
