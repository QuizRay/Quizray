import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  HelpCircle,
  Award,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Settings2,
  Zap,
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { DifficultyLevel } from '../../types';
import type { QuizTest } from '../../types/quiz';

interface TestInstructionsViewProps {
  testId: string;
  onStartQuiz: (testId: string, questionCount?: number, durationMinutes?: number) => void;
  onBack: () => void;
}

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 60];

// 1 minute per question (stays within 5 min to 2 hours range)
function calcDuration(count: number): number {
  return Math.min(Math.max(count, 5), 120);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

export const TestInstructionsView: React.FC<TestInstructionsViewProps> = ({
  testId,
  onStartQuiz,
  onBack,
}) => {
  const [test, setTest] = useState<QuizTest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(10);

  const loadTestData = useCallback(async () => {
    try {
      const data = await quizService.getTestById(testId);
      setTest(data);
      if (data) {
        // Default to 10 questions or the test's own count if smaller
        const defaultCount = Math.min(10, data.questions.length || 10);
        setSelectedQuestionCount(defaultCount > 0 ? defaultCount : 10);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test details.');
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    loadTestData();
  }, [loadTestData]);

  if (isLoading) {
    return (
      <div className="py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingState message="Preparing test instructions..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorState
            error={error}
            onRetry={() => {
              setIsLoading(true);
              setError(null);
              void loadTestData();
            }}
          />
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="py-16 bg-slate-50 min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#0B132B]">Assessment Not Found</h2>
          <p className="text-sm text-slate-600 mt-2">
            The requested test could not be found or has expired.
          </p>
          <div className="mt-6">
            <Button variant="primary" size="sm" onClick={onBack}>
              Back to Tests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const existingSession = quizService.loadActiveSession(test.id);
  const hasActiveSession = Boolean(existingSession);
  const customDuration = calcDuration(selectedQuestionCount);

  const handleStart = () => {
    if (hasActiveSession) {
      // Resume without custom params
      onStartQuiz(test.id);
    } else {
      onStartQuiz(test.id, selectedQuestionCount, customDuration);
    }
  };

  return (
    <div className="py-8 md:py-12 bg-slate-50 min-h-[calc(100vh-5rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-[#2563EB] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tests</span>
          </button>
        </div>

        {/* Test Overview Banner Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/60">
              {test.categoryName}
            </span>
            <Badge variant="difficulty" difficulty={test.difficulty} size="sm">
              {test.difficulty as DifficultyLevel}
            </Badge>
            {hasActiveSession && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                Session in Progress
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
            {test.title}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            {test.description}
          </p>

          {/* Quick Metrics Strip */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                <HelpCircle className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Questions</span>
              </div>
              <p className="text-lg font-extrabold text-[#0B132B]">{hasActiveSession ? (existingSession?.answers ? Object.keys(existingSession.answers).length : selectedQuestionCount) : selectedQuestionCount}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Duration</span>
              </div>
              <p className="text-lg font-extrabold text-[#0B132B]">{hasActiveSession ? `${test.durationMinutes} min` : formatDuration(customDuration)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Total Marks</span>
              </div>
              <p className="text-lg font-extrabold text-[#0B132B]">{hasActiveSession ? test.totalMarks : selectedQuestionCount}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Attempts</span>
              </div>
              <p className="text-lg font-extrabold text-[#0B132B]">{test.totalAttempts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ─── QUIZ CUSTOMIZATION CARD ─── */}
        {!hasActiveSession && (
          <div className="bg-white rounded-3xl border border-blue-200/70 p-6 sm:p-8 shadow-xs mb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0B132B]">Customize Your Test</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose how many questions you want. Fresh questions every attempt!</p>
              </div>
            </div>

            {/* Question count selector */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Number of Questions</p>
              <div className="flex flex-wrap gap-2">
                {QUESTION_COUNT_OPTIONS.map((count) => {
                  const isSelected = selectedQuestionCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSelectedQuestionCount(count)}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-150 cursor-pointer
                        ${isSelected
                          ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-md shadow-blue-500/20 scale-105'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-[#2563EB]'
                        }
                      `}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-calculated time display */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 text-[#2563EB]">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-semibold">Estimated Time:</span>
              </div>
              <span className="text-xl font-extrabold text-[#0B132B]">{formatDuration(customDuration)}</span>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>1 min / question</span>
              </div>
            </div>

            {/* Info note */}
            <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span>
              Questions are randomly selected from the full category pool — different questions each attempt!
            </p>
          </div>
        )}

        {/* Guidelines Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-6">
          <h2 className="text-sm font-bold text-[#0B132B] uppercase tracking-wide mb-5">
            Test Guidelines & Instructions
          </h2>

          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                1
              </div>
              <p>
                <strong>Timer Countdown:</strong> The timer begins immediately when you click <strong>Start Quiz Now</strong>. The countdown will continue in the top bar throughout your test.
              </p>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                2
              </div>
              <p>
                <strong>Automatic Submission:</strong> When the countdown reaches <strong>00:00</strong>, your test will automatically submit with all answered questions up to that point.
              </p>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                3
              </div>
              <p>
                <strong>Question Navigation Palette:</strong> Use the question grid in the palette to move freely between questions at any time.
              </p>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                4
              </div>
              <p>
                <strong>Mark for Review:</strong> You can flag any question with the <Bookmark className="w-3.5 h-3.5 inline text-amber-500" /> icon to revisit it before submitting.
              </p>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                5
              </div>
              <p>
                <strong>Answer Safety:</strong> Your selected choices are securely preserved as you navigate between questions and even across page reloads.
              </p>
            </div>
          </div>

          {/* Palette Status Legend */}
          <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Question Palette Status Indicators
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <span className="text-slate-700">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                  ?
                </span>
                <span className="text-slate-700">Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                  ★
                </span>
                <span className="text-slate-700">Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md border-2 border-[#2563EB] bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-[10px]">
                  1
                </span>
                <span className="text-slate-700">Current Question</span>
              </div>
            </div>
          </div>

          {hasActiveSession && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You have an ongoing test session for this test. Clicking below will resume your test with the exact remaining time.
              </span>
            </div>
          )}
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button variant="outline" size="md" onClick={onBack} className="w-full sm:w-auto">
            <span>Back to Tests</span>
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleStart}
            className="w-full sm:w-auto shadow-md shadow-blue-500/15"
          >
            <span>
              {hasActiveSession
                ? 'Resume Quiz Session'
                : `Start Quiz — ${selectedQuestionCount} Questions (${formatDuration(customDuration)})`}
            </span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
