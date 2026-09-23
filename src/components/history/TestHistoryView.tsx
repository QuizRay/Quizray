import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Award,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { quizService } from '../../services/quizService';
import { Button } from '../ui/Button';
import type { TestHistoryItem } from '../../types/quiz';

interface TestHistoryViewProps {
  onViewResult: (submissionId: string) => void;
  onNavigateTests: () => void;
  onNavigateHome: () => void;
}

const PAGE_SIZE = 10;

export const TestHistoryView: React.FC<TestHistoryViewProps> = ({
  onViewResult,
  onNavigateTests,
  onNavigateHome,
}) => {
  const { user, isAuthenticated, isLoading: isAuthLoading, openAuthModal } = useAuth();
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);

  const fetchHistory = useCallback(async (pageIndex: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await quizService.getUserQuizHistory(PAGE_SIZE, pageIndex * PAGE_SIZE);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load quiz history:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading test history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory(page);
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, page, fetchHistory]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 70) {
      return {
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        ringColor: 'text-emerald-500',
        pill: 'bg-emerald-500',
      };
    }
    if (percentage >= 50) {
      return {
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        ringColor: 'text-amber-500',
        pill: 'bg-amber-500',
      };
    }
    return {
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      ringColor: 'text-rose-500',
      pill: 'bg-rose-500',
    };
  };

  // 1. Unauthenticated Protected Route View
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xs border border-slate-200 space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Sign In to View Test History</h2>
            <p className="text-sm text-slate-600">
              Log in to your QuizRay account to access your completed practice test attempts, detailed scorecards, and step-by-step explanations.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => openAuthModal('login')}
            >
              Sign In to Account
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

  return (
    <div className="py-8 md:py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
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

        {/* Hero Banner Header */}
        <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Test History</h1>
              </div>
              <p className="text-sm text-slate-300">
                Review your completed quiz attempts, scores, and answer explanations.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistory(page)}
              disabled={isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B192C] self-start sm:self-auto shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-slate-200 rounded-md w-1/4" />
                  <div className="h-6 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl" />
                  <div className="w-28 h-10 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Unable to Load History</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistory(page)}
              className="border-rose-300 text-rose-700 hover:bg-rose-100"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && history.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-slate-900">No Completed Tests Yet</h3>
              <p className="text-sm text-slate-600">
                You have not completed any practice tests under this account yet. Take a test now to track your scores, measure accuracy, and review detailed answers.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={onNavigateTests}
              >
                <span>Browse Practice Tests</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Test History List */}
        {!isLoading && !error && history.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Showing {history.length} Attempt{history.length !== 1 ? 's' : ''}
              </p>
              <span className="text-xs text-slate-400">Page {page + 1}</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {history.map((item) => {
                const colors = getPercentageColor(item.percentage);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    {/* Left: Test Details */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {item.categoryName}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(item.submittedAt)}</span>
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                        {item.testTitle}
                      </h3>

                      {/* Stats Pills */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            Score: <strong className="text-slate-900">{item.score}</strong>/{item.maxScore} marks
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Correct: <strong className="text-slate-900">{item.correctCount}</strong>/{item.totalQuestions}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            Time: <strong className="text-slate-900">{formatDuration(item.timeTakenSeconds)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Score Ring & Action Button */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* Percentage Badge */}
                      <div
                        className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border ${colors.badgeBg} shrink-0`}
                      >
                        <span className="text-lg font-extrabold leading-tight">
                          {item.percentage}%
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                          Score
                        </span>
                      </div>

                      {/* View Result Button */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onViewResult(item.id)}
                        className="cursor-pointer"
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        <span>View Result</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 px-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <span className="text-xs text-slate-500 font-medium">Page {page + 1}</span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={history.length < PAGE_SIZE || isLoading}
                className="gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestHistoryView;
