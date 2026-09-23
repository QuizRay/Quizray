import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Award,
  Target,
  Clock,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { quizService } from '../../services/quizService';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import type { PerformanceAnalytics } from '../../types/quiz';

interface PerformanceViewProps {
  onNavigateHome: () => void;
  onNavigateTests: () => void;
  onViewResult: (submissionId: string) => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  onNavigateHome,
  onNavigateTests,
  onViewResult,
}) => {
  const { user, isAuthenticated, isLoading: isAuthLoading, openAuthModal } = useAuth();
  const [analytics, setAnalytics] = useState<PerformanceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await quizService.getUserPerformanceAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load performance analytics:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load performance analytics. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, fetchAnalytics]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  const handleScorecardClick = (submissionId: string) => {
    onViewResult(submissionId);
  };

  // 1. Unauthenticated State (Auth Required Guard)
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center animate-in fade-in duration-200">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xs border border-slate-200 space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Sign In to View Analytics</h2>
            <p className="text-sm text-slate-600">
              Log in to your QuizRay account to access your personal performance analytics, subject mastery, pacing statistics, and historical trends.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => openAuthModal('login')}
            >
              Sign In to View Analytics
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onNavigateHome}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading Skeleton State
  if (isLoading && !analytics) {
    return (
      <div className="py-8 md:py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
          {/* Breadcrumb Skeleton */}
          <div className="h-5 bg-slate-200 rounded-md w-36" />

          {/* Hero Banner Skeleton */}
          <div className="h-44 bg-slate-800/80 rounded-3xl" />

          {/* 4 Overview Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
                <div className="h-4 bg-slate-200 rounded-md w-24" />
                <div className="h-8 bg-slate-200 rounded-md w-16" />
                <div className="h-3 bg-slate-100 rounded-md w-32" />
              </div>
            ))}
          </div>

          {/* Trend & Difficulty Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 bg-white rounded-3xl border border-slate-200 p-6" />
            <div className="h-72 bg-white rounded-3xl border border-slate-200 p-6" />
          </div>
        </div>
      </div>
    );
  }

  // 3. Error State (with retry)
  if (error && !analytics) {
    return (
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto">
        <ErrorState
          title="Performance Analytics Unavailable"
          message="Unable to load performance analytics. Please check your connection and try again."
          error={error}
          onRetry={fetchAnalytics}
        />
      </div>
    );
  }

  const overview = analytics?.overview;
  const hasZeroAttempts = !overview || overview.total_tests === 0;

  return (
    <div className="py-8 md:py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
        {/* Navigation Breadcrumb & Account Tag */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateTests}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-[#2563EB] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Practice Tests</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Account: <span className="text-slate-700 font-semibold">{user?.email}</span>
          </span>
        </div>

        {/* Hero Header Banner */}
        <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/10">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Performance Analytics</h1>
              </div>
              <p className="text-sm text-slate-300 max-w-xl">
                Authoritative insights into your test scores, subject accuracy, pacing efficiency, and focus areas.
              </p>
            </div>

            {/* Refresh Button with high-contrast normal state */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B192C] self-start sm:self-auto shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* 4. Empty State for Authenticated Users with Zero Tests */}
        {hasZeroAttempts ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">No Performance Data Yet</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Complete your first quiz to unlock comprehensive performance analytics, accuracy metrics, category mastery, and pacing insights.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={onNavigateTests}
              >
                <span>Browse Tests</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 1: Overview Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Tests Completed */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tests Completed</span>
                  <div className="p-2 bg-blue-50 text-[#2563EB] rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold text-slate-900">{overview.total_tests}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {overview.total_attempted} attempted / {overview.total_questions} total Qs
                  </p>
                </div>
              </div>

              {/* Card 2: Overall Accuracy */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Accuracy</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Target className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold text-slate-900">{overview.overall_accuracy}%</div>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="text-emerald-600 font-semibold">{overview.total_correct} correct</span>
                    <span className="mx-1 text-slate-300">•</span>
                    <span className="text-rose-500 font-semibold">{overview.total_wrong} wrong</span>
                  </p>
                </div>
              </div>

              {/* Card 3: Average Performance (Primary KPI is Percentage!) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Performance</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold text-slate-900">{overview.avg_percentage}%</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Avg score: <span className="font-semibold text-slate-700">{overview.avg_score} pts</span>
                    <span className="mx-1 text-slate-300">•</span>
                    Peak: <span className="font-semibold text-indigo-600">{overview.best_percentage}%</span>
                  </p>
                </div>
              </div>

              {/* Card 4: Pacing Efficiency (Explicit Denominator Label!) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pacing Efficiency</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold text-slate-900">
                    {overview.avg_time_per_question_seconds}s
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Avg time / attempted question
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDuration(overview.total_time_taken_seconds)} total time spent
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: Score Progression Trend & Difficulty Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Progression Trend Chart */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Score Progression Trend</h3>
                    <p className="text-xs text-slate-500">Latest test scores in chronological order</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      &ge; 70%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      50-69%
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      &lt; 50%
                    </span>
                  </div>
                </div>

                {/* Lightweight SVG / CSS Bar Progression */}
                <div className="pt-6">
                  {analytics?.score_trend && analytics.score_trend.length > 0 ? (
                    <div className="space-y-3">
                      <div className="h-44 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-200 pb-2">
                        {analytics.score_trend.map((item, idx) => {
                          const heightPct = Math.max(Math.min(item.percentage, 100), 8);
                          const barColor =
                            item.percentage >= 70
                              ? 'bg-emerald-500 hover:bg-emerald-600'
                              : item.percentage >= 50
                              ? 'bg-amber-500 hover:bg-amber-600'
                              : 'bg-rose-500 hover:bg-rose-600';

                          return (
                            <div
                              key={item.submission_id || idx}
                              className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                              onClick={() => handleScorecardClick(item.submission_id)}
                            >
                              {/* Hover Tooltip */}
                              <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[11px] rounded-lg px-2 py-1 shadow-lg whitespace-nowrap z-20">
                                <div className="font-bold">{item.percentage}% ({item.score}/{item.max_score} pts)</div>
                                <div className="text-[10px] text-slate-300 truncate max-w-[140px]">{item.test_title}</div>
                              </div>

                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-t-lg transition-all duration-300 ${barColor}`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* X-Axis Labels */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 font-mono">
                        <span>Earlier Attempts ({analytics.score_trend.length})</span>
                        <span>Latest &rarr;</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-sm text-slate-400">
                      Not enough test attempts for progression chart.
                    </div>
                  )}
                </div>
              </div>

              {/* Difficulty Performance Breakdown */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Difficulty Breakdown</h3>
                  <p className="text-xs text-slate-500">Performance categorized by test challenge level</p>
                </div>

                <div className="pt-4 space-y-4">
                  {(['easy', 'medium', 'hard'] as const).map((diffKey) => {
                    const diffData = analytics?.difficulty_performance.find((d) => d.difficulty === diffKey);
                    const testsTaken = diffData?.tests_taken || 0;
                    const avgPct = diffData?.avg_percentage || 0;
                    const accuracy = diffData?.accuracy || 0;

                    const labelConfig = {
                      easy: { label: 'Easy Tests', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', barBg: 'bg-emerald-500' },
                      medium: { label: 'Medium Tests', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', barBg: 'bg-blue-500' },
                      hard: { label: 'Hard Tests', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200', barBg: 'bg-purple-500' },
                    }[diffKey];

                    return (
                      <div key={diffKey} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${labelConfig.badgeBg}`}>
                            {labelConfig.label}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {testsTaken} {testsTaken === 1 ? 'test' : 'tests'}
                          </span>
                        </div>

                        {testsTaken > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">Avg Score: <strong className="text-slate-900">{avgPct}%</strong></span>
                              <span className="text-slate-500">Accuracy: <strong className="text-slate-800">{accuracy}%</strong></span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(avgPct, 100)}%` }}
                                className={`h-full rounded-full ${labelConfig.barBg}`}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No tests completed in this difficulty yet.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 3: Category Mastery & Focus Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Mastery (2 Columns) */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Category Mastery</h3>
                    <p className="text-xs text-slate-500">Subject-level accuracy, attempts, and highest score</p>
                  </div>
                  <BookOpen className="w-5 h-5 text-slate-400" />
                </div>

                {analytics?.category_performance && analytics.category_performance.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {analytics.category_performance.map((cat) => (
                      <div
                        key={cat.category_id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center text-xs font-bold shrink-0">
                              {cat.category_name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-slate-900 truncate max-w-[140px]">
                              {cat.category_name}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {cat.tests_taken} {cat.tests_taken === 1 ? 'quiz' : 'quizzes'}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Avg Performance</span>
                            <span className="font-bold text-slate-900">{cat.avg_percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min(cat.avg_percentage, 100)}%` }}
                              className={`h-full rounded-full ${
                                cat.avg_percentage >= 70
                                  ? 'bg-emerald-500'
                                  : cat.avg_percentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span>Accuracy: <strong className="text-slate-700">{cat.accuracy}%</strong></span>
                            <span>Peak: <strong className="text-slate-700">{cat.best_percentage}%</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No category data recorded yet.</p>
                )}
              </div>

              {/* Focus Areas (Always displayed from lowest performing categories) */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Focus Areas</h3>
                      <p className="text-xs text-slate-500">Priority subjects to practice next</p>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    {analytics?.weak_areas && analytics.weak_areas.length > 0 ? (
                      analytics.weak_areas.map((wa) => {
                        const badgeStyle = {
                          'Needs Practice': 'bg-rose-50 text-rose-700 border-rose-200',
                          'Improve': 'bg-amber-50 text-amber-700 border-amber-200',
                          'Strong': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        }[wa.classification];

                        return (
                          <div
                            key={wa.category_id}
                            className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-100 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                                {wa.category_name}
                              </span>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                {wa.classification}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>Average Score: <strong className="text-slate-800">{wa.avg_percentage}%</strong></span>
                              <span>Accuracy: <strong className="text-slate-800">{wa.accuracy}%</strong></span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 py-3 text-center">Complete tests across different categories to see focus areas.</p>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={onNavigateTests}
                    className="border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-700"
                  >
                    <span>Practice Tests in Focus Areas</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* SECTION 4: Recent Tests */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Tests</h3>
                  <p className="text-xs text-slate-500">Your latest 5 practice attempts</p>
                </div>
                <span className="text-xs text-slate-400 font-medium">Authoritative Submissions</span>
              </div>

              {analytics?.recent_tests && analytics.recent_tests.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {analytics.recent_tests.map((test) => (
                    <div
                      key={test.submission_id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {test.test_title}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200">
                            {test.category_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Completed on {formatDate(test.submitted_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-slate-900">
                            {test.score} / {test.max_score} pts
                          </div>
                          <div className="text-xs font-semibold text-blue-600">
                            {test.percentage}%
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleScorecardClick(test.submission_id)}
                          className="text-xs text-[#2563EB] hover:bg-blue-50 px-2.5 py-1.5"
                        >
                          <span>View Scorecard</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">No recent test attempts recorded.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
