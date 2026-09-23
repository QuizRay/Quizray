import React, { useState, useEffect, useCallback } from 'react';
import {
  Laptop,
  Calculator,
  FlaskConical,
  Globe2,
  BrainCircuit,
  BookOpen,
  Landmark,
  ShieldCheck,
  Clock,
  HelpCircle,
  Star,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { Category, DifficultyLevel } from '../../types';
import type { QuizTest } from '../../types/quiz';

interface CategoryDetailViewProps {
  categoryId?: string;
  onSelectTest: (testId: string) => void;
  onNavigateHome: () => void;
  onSelectCategory: (categoryId: string) => void;
}

const categoryIconMap: Record<Category['iconName'], LucideIcon> = {
  computer: Laptop,
  math: Calculator,
  science: FlaskConical,
  gk: Globe2,
  reasoning: BrainCircuit,
  english: BookOpen,
  banking: Landmark,
  gov: ShieldCheck,
};

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  categoryId = 'cat-computer',
  onSelectTest,
  onNavigateHome,
  onSelectCategory,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [allCategoryTests, setAllCategoryTests] = useState<QuizTest[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [cats, cat] = await Promise.all([
        quizService.getCategories(),
        quizService.getCategoryById(categoryId),
      ]);
      setCategories(cats);
      const activeCat = cat || (cats.length > 0 ? cats[0] : null);
      setCurrentCategory(activeCat);

      if (activeCat) {
        const tests = await quizService.getTestsByCategory(activeCat.id);
        setAllCategoryTests(tests);
      } else {
        setAllCategoryTests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category tests.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingState message="Loading category assessments..." />
        </div>
      </div>
    );
  }

  if (error || !currentCategory) {
    return (
      <div className="py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorState
            error={error || 'Category not found'}
            onRetry={() => {
              setIsLoading(true);
              setError(null);
              void loadData();
            }}
          />
        </div>
      </div>
    );
  }

  const filteredTests = allCategoryTests.filter((test) => {
    if (selectedDifficulty === 'all') return true;
    return test.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
  });

  const IconComponent = categoryIconMap[currentCategory.iconName] || Laptop;

  return (
    <div className="py-8 md:py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-[#2563EB] transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600">Categories</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-[#0B132B]">{currentCategory.name}</span>
        </nav>

        {/* Category Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#2563EB] shrink-0">
                <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                    Category Stream
                  </span>
                  <span className="text-xs text-slate-500">
                    {allCategoryTests.length} Tests Available
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
                  {currentCategory.name}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                  {currentCategory.description}
                </p>
              </div>
            </div>

            {/* Category Quick Pill Selector */}
            <div className="flex flex-wrap gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              {categories.map((cat) => {
                const isCurrent = cat.id === currentCategory.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#0B132B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter and Content Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-[#0B132B] flex items-center gap-2">
            <span>Available Tests</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredTests.length}
            </span>
          </h2>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Difficulty:</span>
            <div className="inline-flex bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    selectedDifficulty === diff
                      ? 'bg-[#2563EB] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tests Grid */}
        {filteredTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test: QuizTest) => (
              <div
                key={test.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-[#2563EB] bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                      {test.categoryName}
                    </span>
                    <Badge variant="difficulty" difficulty={test.difficulty} size="sm">
                      {test.difficulty as DifficultyLevel}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-[#0B132B] hover:text-[#2563EB] transition-colors leading-snug">
                    {test.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {test.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>{test.questions.length} Qs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{test.durationMinutes} Mins</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-700 font-semibold justify-end">
                      <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                      <span>{test.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {test.totalAttempts.toLocaleString()}+ attempts
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectTest(test.id)}
                  >
                    <span>Take Test</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#0B132B]">No Tests Found</h3>
            <p className="mt-2 text-sm text-slate-600">
              No tests match the selected difficulty level in this category. Try selecting &quot;All&quot; or explore another category.
            </p>
            <div className="mt-6">
              <Button variant="outline" size="sm" onClick={() => setSelectedDifficulty('all')}>
                Reset Difficulty Filter
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
