import React, { useState, useEffect, useCallback } from 'react';
import { Clock, HelpCircle, Star, ArrowRight, ArrowLeft, Search, Filter } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { Category, DifficultyLevel } from '../../types';
import type { QuizTest } from '../../types/quiz';

interface TestListViewProps {
  onSelectTest: (testId: string) => void;
  onNavigateHome: () => void;
}

export const TestListView: React.FC<TestListViewProps> = ({ onSelectTest, onNavigateHome }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allTests, setAllTests] = useState<QuizTest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tests, cats] = await Promise.all([
        quizService.getAllTests(),
        quizService.getCategories(),
      ]);
      setAllTests(tests);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment catalog.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingState message="Loading assessment catalog..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorState
            error={error}
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

  const filteredTests = allTests.filter((test) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      test.categoryId === selectedCategory ||
      test.categoryName.toLowerCase() === selectedCategory.toLowerCase();

    const matchesDifficulty =
      selectedDifficulty === 'all' ||
      test.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();

    const matchesSearch =
      searchQuery.trim() === '' ||
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="py-8 md:py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-[#2563EB] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Section Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
            <span>Assessment Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
            All Practice Tests
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-2xl">
            Choose from timed, topic-focused multiple choice practice tests with verified answers and explanations.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests by title or domain..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="md:col-span-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all cursor-pointer"
                aria-label="Filter by Category"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all cursor-pointer"
                aria-label="Filter by Difficulty"
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>
              Showing <strong>{filteredTests.length}</strong> tests
            </span>
          </p>
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
            <h3 className="text-lg font-bold text-[#0B132B]">No Tests Found</h3>
            <p className="mt-2 text-sm text-slate-600">
              No assessments match your current search and filter criteria.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setSearchQuery('');
                }}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
