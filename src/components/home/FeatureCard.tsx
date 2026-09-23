import React from 'react';
import { Timer, BarChart3, Target, Lightbulb, type LucideIcon } from 'lucide-react';
import type { FeatureItem } from '../../types';

interface FeatureCardProps {
  feature: FeatureItem;
}

const featureIconMap: Record<FeatureItem['iconName'], LucideIcon> = {
  timer: Timer,
  results: BarChart3,
  tracking: Target,
  recommendations: Lightbulb,
};

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  const IconComponent = featureIconMap[feature.iconName] || Timer;

  return (
    <div className="relative bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Modern Accent Icon Container */}
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-5 border border-blue-100">
          <IconComponent className="w-6 h-6 text-[#2563EB]" />
        </div>

        {feature.tagline && (
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 block">
            {feature.tagline}
          </span>
        )}

        <h3 className="text-xl font-bold text-[#0B132B]">
          {feature.title}
        </h3>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {feature.description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-[#2563EB]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
        <span>Built for excellence</span>
      </div>
    </div>
  );
};
