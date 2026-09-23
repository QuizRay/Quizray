import React, { useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  CheckCircle2,
  LayoutGrid,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useQuiz } from '../../context/useQuiz';
import { QuizTimer } from './QuizTimer';
import { QuestionPalette } from './QuestionPalette';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

interface QuizEngineViewProps {
  onSubmitted: (testId: string) => void;
  onExit: () => void;
}

export const QuizEngineView: React.FC<QuizEngineViewProps> = ({ onSubmitted, onExit }) => {
  const {
    activeTest,
    currentQuestionIndex,
    answers,
    markedQuestions,
    remainingSeconds,
    timeAllocatedSeconds,
    isSubmitting,
    selectAnswer,
    clearAnswer,
    toggleMarkForReview,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    submitQuiz,
    getQuestionStatus,
  } = useQuiz();

  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!activeTest) {
    return (
      <div className="py-16 bg-slate-50 min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#0B132B]">No Active Quiz Session</h2>
          <p className="text-sm text-slate-600 mt-2">
            Please choose a test to begin an assessment session.
          </p>
          <div className="mt-6">
            <Button variant="primary" size="sm" onClick={onExit}>
              Back to Tests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = activeTest.questions[currentQuestionIndex];
  const selectedOptionId = answers[currentQuestion.id] || null;
  const isMarked = markedQuestions.has(currentQuestion.id);

  const totalQuestions = activeTest.questions.length;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const markedCount = markedQuestions.size;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  const handleConfirmSubmit = async () => {
    setSubmitError(null);
    try {
      await submitQuiz((submission) => {
        setShowSubmitModal(false);
        onSubmitted(submission.testId);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred during submission. Please try again.';
      setSubmitError(msg);
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-5rem)] pb-12">
      {/* Sticky Quiz Engine Top Bar */}
      <div className="sticky top-18 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Title and Question Counter */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Exit Test"
              >
                Exit
              </button>
              <div className="hidden sm:block h-5 w-[1px] bg-slate-200" />
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-[#0B132B] truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                  {activeTest.title}
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Question <span className="font-bold text-[#2563EB]">{currentQuestionIndex + 1}</span> of{' '}
                  <span className="font-bold text-[#0B132B]">{totalQuestions}</span>
                </p>
              </div>
            </div>

            {/* Right: Timer and Submit Action */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Countdown Timer */}
              <QuizTimer
                remainingSeconds={remainingSeconds}
                totalAllocatedSeconds={timeAllocatedSeconds}
              />

              {/* Mobile Palette Toggle Button */}
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                aria-label="Open question palette"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>

              {/* Submit Test Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowSubmitModal(true)}
                disabled={isSubmitting}
                className="font-bold shadow-2xs"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Submit</span>
              </Button>
            </div>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
            <div
              className="bg-[#2563EB] h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Question Interface (8 cols on desktop) */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] font-extrabold text-sm flex items-center justify-center">
                    {currentQuestionIndex + 1}
                  </span>
                  <Badge variant="difficulty" difficulty={currentQuestion.difficulty} size="sm">
                    {currentQuestion.difficulty}
                  </Badge>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    +{currentQuestion.marks} Mark
                  </span>
                </div>

                {/* Mark for Review Button */}
                <button
                  type="button"
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isMarked
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                  aria-pressed={isMarked}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-500 text-amber-500' : 'text-slate-500'}`}
                  />
                  <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                </button>
              </div>

              {/* Question Body */}
              <div className="mb-8">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#0B132B] leading-relaxed">
                  {currentQuestion.text}
                </h2>
              </div>

              {/* Options List */}
              <div className="space-y-3" role="radiogroup" aria-labelledby="question-text">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectAnswer(currentQuestion.id, option.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/80 shadow-xs ring-2 ring-[#2563EB]/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {option.id}
                        </span>
                        <span
                          className={`text-sm sm:text-base font-medium ${
                            isSelected ? 'text-[#0B132B] font-semibold' : 'text-slate-700'
                          }`}
                        >
                          {option.text}
                        </span>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-[#2563EB] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Deselect / Clear selection row */}
              {selectedOptionId && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => clearAnswer(currentQuestion.id)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer p-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear my choice</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Navigation Buttons */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="font-medium"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span>Previous</span>
              </Button>

              <div className="flex items-center gap-2">
                {currentQuestionIndex === totalQuestions - 1 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowSubmitModal(true)}
                    className="font-bold shadow-md shadow-blue-500/15"
                  >
                    <span>Finish & Submit</span>
                    <Send className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={nextQuestion}
                    className="font-semibold shadow-xs"
                  >
                    <span>Save & Next</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Question Palette Sidebar (4 cols on desktop) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-32">
              <QuestionPalette
                questions={activeTest.questions}
                currentQuestionIndex={currentQuestionIndex}
                answers={answers}
                markedQuestions={markedQuestions}
                getQuestionStatus={getQuestionStatus}
                onSelectQuestion={goToQuestion}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Question Palette Drawer Modal */}
      {mobilePaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobilePaletteOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-[#0B132B]">Question Palette</h3>
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QuestionPalette
              questions={activeTest.questions}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              markedQuestions={markedQuestions}
              getQuestionStatus={getQuestionStatus}
              onSelectQuestion={(idx) => {
                goToQuestion(idx);
                setMobilePaletteOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Submit Test Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Assessment"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to submit your answers? Once submitted, your scorecard and detailed explanations will be calculated immediately.
          </p>

          {/* Status Breakdown Summary */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200/80">
              <p className="text-xs font-semibold text-emerald-800">Answered</p>
              <p className="text-lg font-black text-emerald-700">{answeredCount}</p>
            </div>

            <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-700">Unanswered</p>
              <p className="text-lg font-black text-slate-800">{unansweredCount}</p>
            </div>

            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200/80">
              <p className="text-xs font-semibold text-amber-800">Marked</p>
              <p className="text-lg font-black text-amber-700">{markedCount}</p>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You still have {unansweredCount} unanswered questions.
              </span>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Submission Failed</p>
                <p className="mt-0.5 text-rose-700">{submitError}</p>
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitModal(false)}
            >
              Review More
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Evaluating...' : 'Yes, Submit Test'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Exit Test Warning Modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Exit Quiz Session?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Your quiz progress and current elapsed time are stored. You can return to resume this test before the timer runs out.
          </p>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExitModal(false)}
            >
              Stay on Quiz
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowExitModal(false);
                onExit();
              }}
            >
              Exit to Tests
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
