import React, { useState, useEffect } from 'react';
import { quizService } from '../../services/quizService';
import { POPULAR_CATEGORIES } from '../../data/mockData';
import { CategoryCard } from './CategoryCard';
import type { Category } from '../../types';

interface CategoriesSectionProps {
  onSelectCategory?: (categoryId: string) => void;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>(POPULAR_CATEGORIES);

  useEffect(() => {
    let isCurrent = true;
    quizService
      .getCategories()
      .then((cats) => {
        if (isCurrent && cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch((err) => {
        console.error('Failed to load categories for home page:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleCategorySelect = (category: Category) => {
    const slugOrId = category.slug || category.id;
    if (onSelectCategory) {
      onSelectCategory(slugOrId);
    } else {
      window.location.hash = `#/category/${slugOrId}`;
    }
  };

  return (
    <section id="categories" className="py-16 md:py-24 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
            <span>Explore Knowledge Streams</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
            Popular Categories
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Choose from comprehensive domains curated by subject matter experts to test and benchmark your skills.
          </p>
        </div>

        {/* Responsive Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onSelect={handleCategorySelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
