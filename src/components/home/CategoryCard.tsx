import React from 'react';
import {
  Laptop,
  Calculator,
  FlaskConical,
  Globe2,
  BrainCircuit,
  BookOpen,
  Landmark,
  ShieldCheck,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '../../types';

interface CategoryCardProps {
  category: Category;
  onSelect?: (category: Category) => void;
}

const iconMap: Record<Category['iconName'], LucideIcon> = {
  computer: Laptop,
  math: Calculator,
  science: FlaskConical,
  gk: Globe2,
  reasoning: BrainCircuit,
  english: BookOpen,
  banking: Landmark,
  gov: ShieldCheck,
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onSelect }) => {
  const IconComponent = iconMap[category.iconName] || Laptop;

  return (
    <div
      onClick={() => onSelect?.(category)}
      className="group relative bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 hover:border-[#2563EB]/40 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(category);
        }
      }}
      aria-label={`Category: ${category.name} with ${category.testCount} tests`}
    >
      <div>
        {/* Top bar: Icon and Test Count Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 group-hover:border-blue-200 group-hover:bg-blue-50/80 flex items-center justify-center text-slate-700 group-hover:text-[#2563EB] transition-colors duration-200">
            <IconComponent className="w-6 h-6" />
          </div>

          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-[#2563EB] border border-slate-200/60 group-hover:border-blue-200/60 transition-colors">
            {category.testCount} Tests
          </span>
        </div>

        {/* Name and Description */}
        <h3 className="text-lg font-bold text-[#0B132B] group-hover:text-[#2563EB] transition-colors duration-200">
          {category.name}
        </h3>
        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      </div>

      {/* Action link */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-[#2563EB] transition-colors">
        <span>View Category</span>
        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
      </div>
    </div>
  );
};
