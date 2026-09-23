import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { QuizTest, OptionId, QuizSubmission, QuestionStatus } from '../types/quiz';
import { quizService } from '../services/quizService';

interface QuizContextValue {
  activeTest: QuizTest | null;
  currentQuestionIndex: number;
  answers: Record<string, OptionId>;
  markedQuestions: Set<string>;
  remainingSeconds: number;
  timeAllocatedSeconds: number;
  isSubmitting: boolean;
  submissionResult: QuizSubmission | null;
  // Actions
  startQuiz: (test: QuizTest) => void;
  selectAnswer: (questionId: string, optionId: OptionId) => void;
  clearAnswer: (questionId: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: (onSubmitted?: (submission: QuizSubmission) => void) => Promise<QuizSubmission | null>;
  getQuestionStatus: (questionId: string, index: number) => QuestionStatus;
  resetQuizSession: (testId?: string) => void;
  loadSubmission: (testId?: string) => QuizSubmission | null;
}

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTest, setActiveTest] = useState<QuizTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, OptionId>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [timeAllocatedSeconds, setTimeAllocatedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<QuizSubmission | null>(null);

  // Keep a ref to prevent race conditions during auto-submit
  const isAutoSubmittingRef = useRef<boolean>(false);

  // Synchronize and persist state changes to sessionStorage
  const persistSession = useCallback(
    (
      test: QuizTest,
      startedAt: number,
      allocatedSecs: number,
      qIndex: number,
      currAnswers: Record<string, OptionId>,
      marked: Set<string>
    ) => {
      quizService.saveActiveSession({
        testId: test.id,
        quizStartedAt: startedAt,
        timeAllocatedSeconds: allocatedSecs,
        currentQuestionIndex: qIndex,
        answers: currAnswers,
        markedQuestions: Array.from(marked),
      });
    },
    []
  );

  // Calculate remaining seconds strictly using elapsed time from quizStartedAt
  const calculateRemainingTime = useCallback(
    (startedAt: number, allocatedSecs: number): number => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);
      const remaining = allocatedSecs - elapsedSeconds;
      return Math.max(0, remaining);
    },
    []
  );

  // Submit the active quiz
  const submitQuiz = useCallback(
    async (onSubmitted?: (submission: QuizSubmission) => void): Promise<QuizSubmission | null> => {
      if (!activeTest || !quizStartedAt) return null;

      setIsSubmitting(true);
      try {
        const elapsedSeconds = Math.floor((Date.now() - quizStartedAt) / 1000);
        const timeSpent = Math.min(elapsedSeconds, timeAllocatedSeconds);

        const submission = await quizService.submitQuiz(activeTest, answers, timeSpent);
        setSubmissionResult(submission);
        setIsSubmitting(false);

        if (onSubmitted) {
          onSubmitted(submission);
        }
        return submission;
      } catch (err) {
        setIsSubmitting(false);
        console.error('Failed to submit quiz:', err);
        throw err;
      }
    },
    [activeTest, quizStartedAt, timeAllocatedSeconds, answers]
  );

  // Start or resume a quiz session
  const startQuiz = useCallback(
    (test: QuizTest) => {
      isAutoSubmittingRef.current = false;
      const existingSession = quizService.loadActiveSession(test.id);

      if (existingSession) {
        const remaining = calculateRemainingTime(
          existingSession.quizStartedAt,
          existingSession.timeAllocatedSeconds
        );

        // If session is still valid (not expired)
        if (remaining > 0) {
          setActiveTest(test);
          setQuizStartedAt(existingSession.quizStartedAt);
          setTimeAllocatedSeconds(existingSession.timeAllocatedSeconds);
          setRemainingSeconds(remaining);
          setCurrentQuestionIndex(
            Math.min(existingSession.currentQuestionIndex, test.questions.length - 1)
          );
          setAnswers(existingSession.answers || {});
          setMarkedQuestions(new Set(existingSession.markedQuestions || []));
          setSubmissionResult(null);
          return;
        }
      }

      // Fresh session initialization
      const startedAt = Date.now();
      const allocatedSecs = test.durationMinutes * 60;
      setActiveTest(test);
      setQuizStartedAt(startedAt);
      setTimeAllocatedSeconds(allocatedSecs);
      setRemainingSeconds(allocatedSecs);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setMarkedQuestions(new Set());
      setSubmissionResult(null);

      persistSession(test, startedAt, allocatedSecs, 0, {}, new Set());
    },
    [calculateRemainingTime, persistSession]
  );

  // Select an option for a question
  const selectAnswer = useCallback(
    (questionId: string, optionId: OptionId) => {
      setAnswers((prev) => {
        const nextAnswers = { ...prev, [questionId]: optionId };
        if (activeTest && quizStartedAt) {
          persistSession(
            activeTest,
            quizStartedAt,
            timeAllocatedSeconds,
            currentQuestionIndex,
            nextAnswers,
            markedQuestions
          );
        }
        return nextAnswers;
      });
    },
    [activeTest, quizStartedAt, timeAllocatedSeconds, currentQuestionIndex, markedQuestions, persistSession]
  );

  // Clear answer for a question
  const clearAnswer = useCallback(
    (questionId: string) => {
      setAnswers((prev) => {
        const nextAnswers = { ...prev };
        delete nextAnswers[questionId];
        if (activeTest && quizStartedAt) {
          persistSession(
            activeTest,
            quizStartedAt,
            timeAllocatedSeconds,
            currentQuestionIndex,
            nextAnswers,
            markedQuestions
          );
        }
        return nextAnswers;
      });
    },
    [activeTest, quizStartedAt, timeAllocatedSeconds, currentQuestionIndex, markedQuestions, persistSession]
  );

  // Toggle mark for review
  const toggleMarkForReview = useCallback(
    (questionId: string) => {
      setMarkedQuestions((prev) => {
        const nextMarked = new Set(prev);
        if (nextMarked.has(questionId)) {
          nextMarked.delete(questionId);
        } else {
          nextMarked.add(questionId);
        }
        if (activeTest && quizStartedAt) {
          persistSession(
            activeTest,
            quizStartedAt,
            timeAllocatedSeconds,
            currentQuestionIndex,
            answers,
            nextMarked
          );
        }
        return nextMarked;
      });
    },
    [activeTest, quizStartedAt, timeAllocatedSeconds, currentQuestionIndex, answers, persistSession]
  );

  // Navigate directly to question
  const goToQuestion = useCallback(
    (index: number) => {
      if (!activeTest || index < 0 || index >= activeTest.questions.length) return;
      setCurrentQuestionIndex(index);
      if (quizStartedAt) {
        persistSession(
          activeTest,
          quizStartedAt,
          timeAllocatedSeconds,
          index,
          answers,
          markedQuestions
        );
      }
    },
    [activeTest, quizStartedAt, timeAllocatedSeconds, answers, markedQuestions, persistSession]
  );

  // Next question
  const nextQuestion = useCallback(() => {
    if (!activeTest) return;
    goToQuestion(Math.min(currentQuestionIndex + 1, activeTest.questions.length - 1));
  }, [activeTest, currentQuestionIndex, goToQuestion]);

  // Previous question
  const prevQuestion = useCallback(() => {
    goToQuestion(Math.max(currentQuestionIndex - 1, 0));
  }, [currentQuestionIndex, goToQuestion]);

  // Determine question status for palette
  const getQuestionStatus = useCallback(
    (questionId: string, index: number): QuestionStatus => {
      const isCurrent = index === currentQuestionIndex;
      const isAnswered = Boolean(answers[questionId]);
      const isMarked = markedQuestions.has(questionId);

      if (isCurrent) return 'current';
      if (isMarked && isAnswered) return 'marked-answered';
      if (isMarked) return 'marked';
      if (isAnswered) return 'answered';
      return 'unanswered';
    },
    [currentQuestionIndex, answers, markedQuestions]
  );

  // Reset quiz session
  const resetQuizSession = useCallback(
    (testId?: string) => {
      const targetId = testId || activeTest?.id;
      if (targetId) {
        quizService.clearActiveSession(targetId);
      }
      setActiveTest(null);
      setQuizStartedAt(null);
      setTimeAllocatedSeconds(0);
      setRemainingSeconds(0);
      setAnswers({});
      setMarkedQuestions(new Set());
      setSubmissionResult(null);
    },
    [activeTest]
  );

  // Load latest submission
  const loadSubmission = useCallback((testId?: string): QuizSubmission | null => {
    const sub = quizService.getLatestSubmission(testId);
    if (sub) {
      setSubmissionResult(sub);
    }
    return sub;
  }, []);

  // Timer heartbeat effect: runs every second when test is active
  useEffect(() => {
    if (!activeTest || !quizStartedAt || isSubmitting) return;

    const interval = setInterval(() => {
      const remaining = calculateRemainingTime(quizStartedAt, timeAllocatedSeconds);
      setRemainingSeconds(remaining);

      // Auto-submit when countdown hits zero
      if (remaining <= 0 && !isAutoSubmittingRef.current) {
        isAutoSubmittingRef.current = true;
        clearInterval(interval);
        submitQuiz((sub) => {
          // Redirect to result via hash route
          window.location.hash = `#/test/${sub.testId}/result`;
        }).catch((err) => {
          console.error('Auto-submit failed:', err);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTest, quizStartedAt, timeAllocatedSeconds, isSubmitting, calculateRemainingTime, submitQuiz]);

  return (
    <QuizContext.Provider
      value={{
        activeTest,
        currentQuestionIndex,
        answers,
        markedQuestions,
        remainingSeconds,
        timeAllocatedSeconds,
        isSubmitting,
        submissionResult,
        startQuiz,
        selectAnswer,
        clearAnswer,
        toggleMarkForReview,
        goToQuestion,
        nextQuestion,
        prevQuestion,
        submitQuiz,
        getQuestionStatus,
        resetQuizSession,
        loadSubmission,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export { QuizContext };
export type { QuizContextValue };
