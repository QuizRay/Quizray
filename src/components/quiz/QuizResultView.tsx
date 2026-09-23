import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Compass,
  ArrowLeft,
  Filter,
  Check,
  X,
  MinusCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useQuiz } from '../../context/useQuiz';
import { quizService } from '../../services/quizService';
import { Button } from '../ui/Button';
import type { QuestionResult, QuizSubmission } from '../../types/quiz';

interface QuizResultViewProps {
  testId?: string;
  submissionId?: string;
  onRetake: (testId: string) => void;
  onExploreTests: () => void;
  onNavigateHome: () => void;
  onNavigateHistory?: () => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  testId,
  submissionId,
  onRetake,
  onExploreTests,
  onNavigateHome,
  onNavigateHistory,
}) => {
  const { submissionResult, loadSubmission, resetQuizSession } = useQuiz();
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong' | 'unattempted'>('all');
  const [historicalSubmission, setHistoricalSubmission] = useState<QuizSubmission | null>(null);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState<boolean>(!!submissionId);
  const [historicalError, setHistoricalError] = useState<string | null>(null);

  useEffect(() => {
    if (submissionId) {
      let isMounted = true;
      setIsLoadingHistorical(true);
      setHistoricalError(null);
      quizService
        .getHistoricalSubmission(submissionId)
        .then((data) => {
          if (isMounted) {
            if (!data) {
              setHistoricalError('Historical scorecard not found or access denied.');
            } else {
              setHistoricalSubmission(data);
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            setHistoricalError(err instanceof Error ? err.message : 'Failed to load historical submission.');
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingHistorical(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [submissionId]);

  if (isLoadingHistorical) {
    return (
      <div className="py-16 bg-slate-50 min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Loading Historical Scorecard...</h3>
          <p className="text-xs text-slate-500">Fetching verified scorecard and question solutions from database.</p>
        </div>
      </div>
    );
  }

  if (historicalError) {
    return (
      <div className="py-16 bg-slate-50 min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center space-y-4">
          <Award className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-[#0B132B]">Scorecard Not Found</h2>
          <p className="text-sm text-slate-600">{historicalError}</p>
          <div className="pt-2 flex justify-center gap-3">
            {onNavigateHistory && (
              <Button variant="primary" size="sm" onClick={onNavigateHistory}>
                Back to Test History
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onExploreTests}>
              Browse Tests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const submission = submissionId
    ? historicalSubmission
    : submissionResult || (testId ? loadSubmission(testId) : null);

  if (!submission) {
    return (
      <div className="py-16 bg-slate-50 min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <Award className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#0B132B]">No Scorecard Available</h2>
          <p className="text-sm text-slate-600 mt-2">
            No completed submission was found for this test. Please take the test to view your scorecard.
          </p>
          <div className="mt-6">
            <Button variant="primary" size="sm" onClick={onExploreTests}>
              Browse Tests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const feedback = quizService.getPerformanceFeedback(submission.percentage);

  // Time taken formatting
  const timeTakenMinutes = Math.floor(submission.timeTakenSeconds / 60);
  const timeTakenSecs = submission.timeTakenSeconds % 60;
  const formattedTimeTaken = `${timeTakenMinutes}m ${timeTakenSecs}s`;

  const allocatedMinutes = Math.floor(submission.timeAllocatedSeconds / 60);

  // Accuracy calculation
  const accuracy =
    submission.attemptedCount > 0
      ? Math.round((submission.correctCount / submission.attemptedCount) * 100)
      : 0;

  // Filter questions for review
  const filteredQuestions = submission.questionResults.filter((item: QuestionResult) => {
    if (filterType === 'correct') return item.isCorrect;
    if (filterType === 'wrong') return item.isAttempted && !item.isCorrect;
    if (filterType === 'unattempted') return !item.isAttempted;
    return true;
  });

  const handleRetakeClick = () => {
    resetQuizSession(submission.testId);
    onRetake(submission.testId);
  };

  return (
    <div className="py-8 md:py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={submissionId && onNavigateHistory ? onNavigateHistory : onExploreTests}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-[#2563EB] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{submissionId && onNavigateHistory ? 'Back to Test History' : 'Back to All Tests'}</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Submitted on {new Date(submission.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
            {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Primary Score Banner Card */}
        <div className="bg-[#0B132B] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 mb-8 relative overflow-hidden">
          {/* Subtle brand glow accents */}
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-[#2563EB]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#F59E0B]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Score & Grade Percentage Circle */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full flex items-center justify-center border-4 border-white/10 bg-white/5 shadow-inner">
                {/* SVG Progress Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    className="text-white/10"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    className="text-[#2563EB]"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 68}
                    strokeDashoffset={2 * Math.PI * 68 * (1 - submission.percentage / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
                    {submission.percentage}%
                  </span>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider mt-0.5">
                    Score
                  </span>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{feedback.badge}</span>
              </div>
            </div>

            {/* Right: Detailed Summary and Feedback */}
            <div className="md:col-span-8 text-center md:text-left">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                {submission.categoryName} Assessment
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                {feedback.title}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                {feedback.message}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Button
                  variant="gold"
                  size="md"
                  onClick={handleRetakeClick}
                  className="font-bold shadow-md shadow-amber-500/10"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  <span>Retake Test</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={onExploreTests}
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
                >
                  <Compass className="w-4 h-4 mr-1.5" />
                  <span>Browse Other Tests</span>
                </Button>

                <Button
                  variant="ghost"
                  size="md"
                  onClick={onNavigateHome}
                  className="text-slate-300 hover:text-white hover:bg-white/5"
                >
                  <span>Home</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-10">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs text-center">
            <p className="text-xs font-semibold text-slate-500 mb-1">Score</p>
            <p className="text-xl font-extrabold text-[#0B132B]">
              {submission.score} <span className="text-xs text-slate-400 font-normal">/ {submission.maxScore}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Correct</span>
            </div>
            <p className="text-xl font-extrabold text-emerald-700">{submission.correctCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs text-center">
            <div className="flex items-center justify-center gap-1 text-rose-600 mb-1">
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Incorrect</span>
            </div>
            <p className="text-xl font-extrabold text-rose-700">{submission.wrongCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs text-center">
            <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
              <MinusCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Unattempted</span>
            </div>
            <p className="text-xl font-extrabold text-slate-700">{submission.unattemptedCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs text-center">
            <div className="flex items-center justify-center gap-1 text-[#2563EB] mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Time Taken</span>
            </div>
            <p className="text-lg font-extrabold text-[#0B132B]">{formattedTimeTaken}</p>
            <p className="text-[10px] text-slate-400">of {allocatedMinutes}m</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs text-center">
            <p className="text-xs font-semibold text-slate-500 mb-1">Accuracy</p>
            <p className="text-xl font-extrabold text-[#2563EB]">{accuracy}%</p>
          </div>
        </div>

        {/* Question-Wise Review Section */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
                Question-Wise Review & Explanations
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Detailed answer verification and conceptual explanations for every question.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white text-[#0B132B] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({submission.totalQuestions})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('correct')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterType === 'correct'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Correct ({submission.correctCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('wrong')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterType === 'wrong'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Incorrect ({submission.wrongCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('unattempted')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterType === 'unattempted'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({submission.unattemptedCount})
              </button>
            </div>
          </div>

          {/* Question Review Cards */}
          {filteredQuestions.length > 0 ? (
            <div className="space-y-6">
              {filteredQuestions.map((q: QuestionResult) => {
                let statusBadge = (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    <MinusCircle className="w-3.5 h-3.5" />
                    <span>Unattempted</span>
                  </span>
                );

                if (q.isCorrect) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Correct (+{q.marksAwarded} Mark)</span>
                    </span>
                  );
                } else if (q.isAttempted && !q.isCorrect) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80">
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      <span>Incorrect (0 Marks)</span>
                    </span>
                  );
                }

                return (
                  <div
                    key={q.questionId}
                    className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                        Question {q.questionNumber}
                      </span>
                      {statusBadge}
                    </div>

                    {/* Question Text */}
                    <h3 className="text-base font-bold text-[#0B132B] mb-4 leading-relaxed">
                      {q.text}
                    </h3>

                    {/* Options Breakdown */}
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt) => {
                        const isCorrectOption = opt.id === q.correctAnswer;
                        const isUserChoice = opt.id === q.userAnswer;

                        let optionStyle = 'border-slate-200 bg-white text-slate-700';

                        if (isCorrectOption) {
                          optionStyle = 'border-emerald-300 bg-emerald-50/80 text-emerald-950 font-semibold';
                        } else if (isUserChoice && !isCorrectOption) {
                          optionStyle = 'border-rose-300 bg-rose-50/80 text-rose-950 font-medium';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm ${optionStyle}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                  isCorrectOption
                                    ? 'bg-emerald-600 text-white'
                                    : isUserChoice
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-xs">
                              {isUserChoice && !isCorrectOption && (
                                <span className="font-bold text-rose-700 inline-flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" />
                                  <span>Your Choice</span>
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isUserChoice ? 'Your Choice (Correct)' : 'Correct Answer'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* In-depth Explanation Callout */}
                    <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-blue-100 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] mb-1.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>Explanation & Concept Verification</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <Filter className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No questions match this filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
