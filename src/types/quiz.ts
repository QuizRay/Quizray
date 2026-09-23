import type { DifficultyLevel } from './index';

export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface QuizOption {
  id: OptionId;
  text: string;
}

// Student-safe question format without answer key
export interface StudentQuestion {
  id: string;
  testId: string;
  questionNumber: number;
  text: string;
  options: QuizOption[];
  difficulty: DifficultyLevel;
  marks: number;
}

// Full question format (for admin or post-submission review)
export interface Question extends StudentQuestion {
  correctOptionId: OptionId;
  explanation: string;
}

export interface QuizTest {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  description: string;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  totalMarks: number;
  isPublished?: boolean;
  questions: (Question | StudentQuestion)[];
  totalAttempts: number;
  rating: number;
  createdAt: string;
  updatedAt?: string;
}

export type QuestionStatus = 'current' | 'answered' | 'unanswered' | 'marked' | 'marked-answered';

export interface QuestionResult {
  questionId: string;
  questionNumber: number;
  text: string;
  options: QuizOption[];
  userAnswer: OptionId | null;
  correctAnswer: OptionId;
  isCorrect: boolean;
  isAttempted: boolean;
  marksAwarded: number;
  explanation: string;
}

export interface QuizSubmission {
  submissionId?: string;
  testId: string;
  testTitle: string;
  categoryName: string;
  totalQuestions: number;
  attemptedCount: number;
  unattemptedCount: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  maxScore: number;
  percentage: number;
  timeAllocatedSeconds: number;
  timeTakenSeconds: number;
  submittedAt: string;
  answers: Record<string, OptionId>;
  questionResults: QuestionResult[];
}

export interface TestHistoryItem {
  id: string;
  testId: string;
  testTitle: string;
  categoryName: string;
  score: number;
  maxScore: number;
  percentage: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  timeTakenSeconds: number;
  submittedAt: string;
}

export interface QuizSessionStorageState {
  testId: string;
  quizStartedAt: number; // timestamp ms
  timeAllocatedSeconds: number;
  currentQuestionIndex: number;
  answers: Record<string, OptionId>;
  markedQuestions: string[]; // question IDs
}

// ------------------------------------------------------------------------------
// Admin Interfaces
// ------------------------------------------------------------------------------
export interface AdminStats {
  totalCategories: number;
  totalTests: number;
  publishedTests: number;
  totalQuestions: number;
  totalSubmissions: number;
  isSupabaseConnected: boolean;
}

export interface AdminTestFormData {
  title: string;
  slug: string;
  categoryId: string;
  description: string;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  totalMarks: number;
  isPublished?: boolean;
}

export interface AdminQuestionFormData {
  testId: string;
  questionNumber?: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOptionId: OptionId;
  explanation: string;
  difficulty: DifficultyLevel;
  marks: number;
}

export interface AdminCategoryFormData {
  name: string;
  slug: string;
  description: string;
  icon?: string;
  iconName?: string;
  isActive?: boolean;
  sortOrder?: number;
  displayOrder?: number;
}

// ------------------------------------------------------------------------------
// Performance / Analytics Interfaces (Phase 3B-2)
// ------------------------------------------------------------------------------
export interface PerformanceOverview {
  total_tests: number;
  avg_score: number;
  avg_percentage: number;
  overall_accuracy: number;
  total_correct: number;
  total_wrong: number;
  total_attempted: number;
  total_questions: number;
  best_percentage: number;
  total_time_taken_seconds: number;
  avg_time_per_test_seconds: number;
  avg_time_per_question_seconds: number;
  time_utilization_percentage: number;
}

export interface ScoreTrendItem {
  submission_id: string;
  test_id: string;
  test_title: string;
  percentage: number;
  score: number;
  max_score: number;
  submitted_at: string;
}

export interface CategoryPerformance {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  tests_taken: number;
  avg_percentage: number;
  accuracy: number;
  total_correct: number;
  total_attempted: number;
  best_percentage: number;
}

export interface DifficultyPerformance {
  difficulty: 'easy' | 'medium' | 'hard';
  tests_taken: number;
  avg_percentage: number;
  accuracy: number;
}

export interface WeakArea {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  tests_taken: number;
  avg_percentage: number;
  accuracy: number;
  classification: 'Needs Practice' | 'Improve' | 'Strong';
}

export interface RecentTestPerformance {
  submission_id: string;
  test_id: string;
  test_title: string;
  category_name: string;
  percentage: number;
  score: number;
  max_score: number;
  submitted_at: string;
}

export interface PerformanceAnalytics {
  overview: PerformanceOverview;
  score_trend: ScoreTrendItem[];
  category_performance: CategoryPerformance[];
  difficulty_performance: DifficultyPerformance[];
  weak_areas: WeakArea[];
  recent_tests: RecentTestPerformance[];
}

// ------------------------------------------------------------------------------
// Question Bank Interfaces (Phase Q2)
// ------------------------------------------------------------------------------

export type QuestionBankStatus = 'draft' | 'under_review' | 'published' | 'archived';
export type QuestionBankDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionBankSourceType =
  | 'curriculum'
  | 'official_exam'
  | 'textbook'
  | 'ai_assisted'
  | 'original';

export interface QuestionBankFilters {
  search: string;
  categoryId: string | 'all';
  status: 'all' | QuestionBankStatus;
  difficulty: 'all' | QuestionBankDifficulty;
  subject: string | 'all';
  topic: string | 'all';
  examType: string | 'all';
  sourceType: 'all' | QuestionBankSourceType;
  language: string | 'all';
  page: number;
  pageSize: number;
}

export interface QuestionBankOption {
  id?: string;
  optionKey: OptionId;
  optionText: string;
}

export interface QuestionBankLinkedTest {
  testId: string;
  testTitle: string;
  isPublished: boolean;
  questionNumber: number;
  marks: number;
}

export interface QuestionBankListItem {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  questionText: string;
  difficulty: QuestionBankDifficulty;
  marks: number;
  status: QuestionBankStatus;
  subject?: string | null;
  topic?: string | null;
  examType?: string | null;
  examName?: string | null;
  examYear?: number | null;
  sourceType: QuestionBankSourceType;
  sourceReference?: string | null;
  language: string;
  createdBy?: string | null;
  verifiedBy?: string | null;
  isVerified: boolean;
  contentHash?: string | null;
  linkedTestsCount: number;
  optionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBankListResponse {
  items: QuestionBankListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QuestionBankDetail {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  questionText: string;
  difficulty: QuestionBankDifficulty;
  marks: number;
  status: QuestionBankStatus;
  subject?: string | null;
  topic?: string | null;
  examType?: string | null;
  examName?: string | null;
  examYear?: number | null;
  sourceType: QuestionBankSourceType;
  sourceReference?: string | null;
  language: string;
  correctOptionId: OptionId;
  explanation: string;
  createdBy?: string | null;
  verifiedBy?: string | null;
  isVerified: boolean;
  verificationNotes?: string | null;
  contentHash?: string | null;
  options: QuestionBankOption[];
  linkedTests: QuestionBankLinkedTest[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBankSaveInput {
  questionId?: string;
  categoryId: string;
  questionText: string;
  difficulty: QuestionBankDifficulty;
  marks: number;
  correctOptionId: OptionId;
  explanation: string;
  options: Array<{
    optionKey: OptionId;
    optionText: string;
  }>;
  status?: QuestionBankStatus;
  subject?: string | null;
  topic?: string | null;
  examType?: string | null;
  examName?: string | null;
  examYear?: number | null;
  sourceType?: QuestionBankSourceType;
  sourceReference?: string | null;
  language?: string;
  verificationNotes?: string | null;
}

export type QuestionBankSaveResponse = QuestionBankDetail;

export interface QuestionBankActionResult {
  success: boolean;
  id: string;
  action?: string;
  status?: string;
  message: string;
}

// ------------------------------------------------------------------------------
// Bulk CSV/Excel Question Import Interfaces (Phase Q3)
// ------------------------------------------------------------------------------

/**
 * Valid status values permissible on CSV/XLSX bulk import input.
 * Excludes 'archived' as new questions cannot be imported directly into archived state.
 */
export type ImportQuestionStatus = 'draft' | 'under_review' | 'published';

/**
 * Categorization of duplicate detection outcomes for bulk import items.
 */
export type ImportDuplicateType = 'none' | 'in_file' | 'in_database' | 'both';

/**
 * Discrete error codes for granular row-level validation.
 */
export type ImportErrorCode =
  | 'ERR_EMPTY_QUESTION'
  | 'ERR_QUESTION_TOO_SHORT'
  | 'ERR_QUESTION_TOO_LONG'
  | 'ERR_EMPTY_OPTION'
  | 'ERR_OPTION_TOO_LONG'
  | 'ERR_DUPLICATE_OPTION_TEXT'
  | 'ERR_INVALID_CORRECT_OPTION'
  | 'ERR_MISSING_CATEGORY'
  | 'ERR_UNKNOWN_CATEGORY'
  | 'ERR_INACTIVE_CATEGORY'
  | 'ERR_INVALID_DIFFICULTY'
  | 'ERR_INVALID_MARKS'
  | 'ERR_INVALID_STATUS'
  | 'ERR_INVALID_SOURCE_TYPE'
  | 'ERR_AI_PUBLISHED_BLOCKED'
  | 'ERR_MISSING_EXPLANATION'
  | 'ERR_INVALID_EXAM_YEAR'
  | 'ERR_INTERNAL_DUPLICATE'
  | 'ERR_DATABASE_DUPLICATE'
  | 'ERR_SERVER_INSERT_FAILED'
  | 'ERR_UNKNOWN_HEADER'
  | 'ERR_FORBIDDEN_HEADER'
  | 'ERR_MISSING_HEADER'
  | 'ERR_FILE_TOO_LARGE'
  | 'ERR_TOO_MANY_ROWS'
  | 'ERR_INVALID_FILE_TYPE';

/**
 * Represents one normalized raw row parsed from the spreadsheet before full domain validation.
 * Excludes database/server-managed fields (id, questionId, test_id, question_number, created_by, verified_by, content_hash).
 */
export interface ImportRow {
  rowNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
  category: string;
  difficulty?: QuestionBankDifficulty;
  marks?: number;
  subject?: string;
  topic?: string;
  examType?: string;
  examName?: string;
  examYear?: number;
  sourceType?: QuestionBankSourceType;
  sourceReference?: string;
  language?: string;
  status?: ImportQuestionStatus;
}

/**
 * Granular row-level error or warning record for user feedback and error report export.
 */
export interface ImportRowError {
  rowNumber: number;
  field: string;
  code: ImportErrorCode | string;
  severity: 'error' | 'warning';
  message: string;
  suppliedValue?: string;
  suggestedCorrection?: string;
}

/**
 * Fully parsed and analyzed row combining original input, validation state, category mapping,
 * content hash, and ready-to-save payload.
 */
export interface ImportParsedRow {
  rowNumber: number;
  raw: ImportRow;
  normalizedData?: QuestionBankSaveInput;
  errors: ImportRowError[];
  warnings: ImportRowError[];
  duplicateType: ImportDuplicateType;
  duplicateExistingId?: string;
  contentHash?: string;
  resolvedCategoryId?: string;
  resolvedCategoryName?: string;
  isValid: boolean;
}

/**
 * Aggregated summary statistics for the import preview step.
 */
export interface ImportPreviewSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  warningRows: number;
  readyToImport: number;
  skippedRows: number;
}

/**
 * Final execution report for bulk import execution.
 */
export interface ImportExecutionResult {
  totalAttempted: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: ImportRowError[];
  isComplete: boolean;
}

