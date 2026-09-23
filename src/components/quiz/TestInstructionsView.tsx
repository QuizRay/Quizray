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
  onStartQuiz: (testId: string) => void;
  onBack: () => void;
}

export const TestInstructionsView: React.FC<TestInstructionsViewProps> = ({
  testId,
  onStartQuiz,
  onBack,
}) => {
  const [test, setTest] = useState<QuizTest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTestData = useCallback(async () => {
    try {
      const data = await quizService.getTestById(testId);
      setTest(data);
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
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-8">
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
                <span className="text-xs font-medium">Questions</span>
              </div>
              <p className="text-xl font-bold text-[#0B132B]">{test.questions.length}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Duration</span>
              </div>
              <p className="text-xl font-bold text-[#2563EB]">{test.durationMinutes} Mins</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs font-medium">Total Marks</span>
              </div>
              <p className="text-xl font-bold text-[#0B132B]">{test.totalMarks} Marks</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Marking</span>
              </div>
              <p className="text-sm font-bold text-emerald-600 pt-1">+1 per correct</p>
            </div>
          </div>
        </div>

        {/* Rules and Guidelines Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-8 space-y-6">
          <h2 className="text-xl font-bold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
            Examination Guidelines & Instructions
          </h2>

          <div className="space-y-4 text-sm text-slate-700">
            <div className="flex items-start gap-3.5">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                1
              </div>
              <p>
                <strong>Timed Countdown:</strong> The timer begins immediately when you click <strong>Start Quiz Now</strong>. The countdown will continue in the top bar throughout your test.
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
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
                  •
                </span>
                <span className="text-slate-700">Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                  ⚑
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
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
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
            onClick={() => onStartQuiz(test.id)}
            className="w-full sm:w-auto shadow-md shadow-blue-500/15"
          >
            <span>{hasActiveSession ? 'Resume Quiz Session' : 'Start Quiz Now'}</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
