import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { POPULAR_CATEGORIES } from '../data/mockData';
import { FULL_QUIZ_TESTS } from '../data/quizQuestions';
import type { Category } from '../types';
import type {
  QuizTest,
  OptionId,
  QuizSubmission,
  TestHistoryItem,
  QuestionResult,
  QuizSessionStorageState,
  StudentQuestion,
  Question,
  AdminStats,
  AdminTestFormData,
  AdminQuestionFormData,
  AdminCategoryFormData,
  PerformanceAnalytics,
  QuestionBankFilters,
  QuestionBankListItem,
  QuestionBankListResponse,
  QuestionBankDetail,
  QuestionBankSaveInput,
  QuestionBankActionResult,
  ImportRow,
  ImportRowError,
  ImportParsedRow,
  ImportExecutionResult,
} from '../types/quiz';
import { parseImportFile, type ParseImportFileResult } from '../utils/importParser';
import {
  validateImportRows,
  computeContentHash,
  type AvailableCategory,
  type ValidateImportResult,
} from '../utils/importValidator';

const SESSION_PREFIX = 'quizray_session_';
const SUBMISSION_PREFIX = 'quizray_submission_';
const LATEST_SUBMISSION_KEY = 'quizray_latest_submission';
const LOCAL_HISTORY_KEY = 'quizray_local_quiz_history';

// In-memory store for Admin mock preview when Supabase is unconfigured
let localTests = [...FULL_QUIZ_TESTS];
let localCategories = [...POPULAR_CATEGORIES];

export const quizService = {
  // Check whether Supabase is actively used
  isLiveDatabase(): boolean {
    return isSupabaseConfigured();
  },

  // ----------------------------------------------------------------------------
  // Public Student Operations (Categories)
  // ----------------------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured()) {
      return localCategories.filter((c) => c.isActive);
    }

    const client = supabase!;
    const { data, error } = await client
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Database error fetching categories: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      iconName: (row.icon || 'computer') as Category['iconName'],
      testCount: 0, // Computed by joining tests if needed
      orderIndex: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  },

  async getCategoryById(categoryIdOrSlug: string): Promise<Category | null> {
    if (!isSupabaseConfigured()) {
      const found = localCategories.find(
        (c) => c.id === categoryIdOrSlug || c.slug === categoryIdOrSlug
      );
      return found || null;
    }

    const client = supabase!;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categoryIdOrSlug
    );

    let query = client.from('categories').select('*');
    if (isUuid) {
      query = query.or(`id.eq.${categoryIdOrSlug},slug.eq.${categoryIdOrSlug}`);
    } else {
      query = query.eq('slug', categoryIdOrSlug);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Database error fetching category: ${error.message}`);
    }
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      iconName: (data.icon || 'computer') as Category['iconName'],
      testCount: 0,
      orderIndex: data.sort_order,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  },

  // ----------------------------------------------------------------------------
  // Public Student Operations (Tests)
  // ----------------------------------------------------------------------------
  async getAllTests(): Promise<QuizTest[]> {
    if (!isSupabaseConfigured()) {
      return localTests.filter((t) => t.isPublished !== false);
    }

    const client = supabase!;
    // Relational select: join category name efficiently in a single query
    const { data, error } = await client
      .from('tests')
      .select('*, categories(name, slug)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error fetching tests: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      categoryId: row.category_id,
      categoryName: row.categories?.name || 'General',
      description: row.description || '',
      durationMinutes: row.duration_minutes,
      difficulty: row.difficulty === 'easy' ? 'Beginner' : row.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
      totalMarks: row.total_marks,
      isPublished: row.is_published,
      totalAttempts: row.total_attempts || 0,
      rating: Number(row.rating) || 4.8,
      createdAt: row.created_at,
      questions: [],
    }));
  },

  async getTestsByCategory(categoryIdOrSlug: string): Promise<QuizTest[]> {
    if (!isSupabaseConfigured()) {
      const cat = localCategories.find((c) => c.id === categoryIdOrSlug || c.slug === categoryIdOrSlug);
      if (!cat) return [];
      return localTests.filter((t) => (t.categoryId === cat.id || t.categoryId === cat.slug) && t.isPublished !== false);
    }

    const category = await this.getCategoryById(categoryIdOrSlug);
    if (!category) return [];

    const client = supabase!;
    const { data, error } = await client
      .from('tests')
      .select('*, categories(name, slug)')
      .eq('category_id', category.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error fetching category tests: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      categoryId: row.category_id,
      categoryName: row.categories?.name || category.name,
      description: row.description || '',
      durationMinutes: row.duration_minutes,
      difficulty: row.difficulty === 'easy' ? 'Beginner' : row.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
      totalMarks: row.total_marks,
      isPublished: row.is_published,
      totalAttempts: row.total_attempts || 0,
      rating: Number(row.rating) || 4.8,
      createdAt: row.created_at,
      questions: [],
    }));
  },

  // ----------------------------------------------------------------------------
  // CRITICAL SECURITY REQUIREMENT:
  // Fetch test and questions for students WITHOUT exposing answer keys or explanations
  // ----------------------------------------------------------------------------
  async getStudentTestById(testIdOrSlug: string): Promise<QuizTest | null> {
    if (!isSupabaseConfigured()) {
      const found = localTests.find((t) => t.id === testIdOrSlug || t.slug === testIdOrSlug);
      if (!found) return null;

      // Strip correctOptionId and explanation to guarantee identical student security in local mode
      const studentSafeQuestions: StudentQuestion[] = found.questions.map((q) => ({
        id: q.id,
        testId: q.testId,
        questionNumber: q.questionNumber,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
        marks: q.marks,
      }));

      return {
        ...found,
        questions: studentSafeQuestions,
      };
    }

    const client = supabase!;

    // Call secure server-side RPC `get_test_for_student` which excludes correct_option_id and explanation
    const { data, error } = await client.rpc('get_test_for_student', {
      p_slug_or_id: testIdOrSlug,
    });

    if (error) {
      throw new Error(`Database error fetching test: ${error.message}`);
    }
    if (!data) return null;

    // Map RPC json response
    const testRow = data as {
      id: string;
      category_id: string;
      title: string;
      slug: string;
      description: string;
      duration_minutes: number;
      difficulty: string;
      total_marks: number;
      is_published: boolean;
      total_attempts: number;
      rating: number;
      created_at: string;
      questions: Array<{
        id: string;
        test_id: string;
        question_number: number;
        text: string;
        difficulty: string;
        marks: number;
        options: Array<{ id: string; option_key: OptionId; text: string }>;
      }>;
    };

    const studentQuestions: StudentQuestion[] = (testRow.questions || []).map((q) => ({
      id: q.id,
      testId: q.test_id,
      questionNumber: q.question_number,
      text: q.text,
      difficulty: q.difficulty === 'easy' ? 'Beginner' : q.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
      marks: q.marks,
      options: (q.options || []).map((o) => ({
        id: o.option_key,
        text: o.text,
      })),
    }));

    return {
      id: testRow.id,
      title: testRow.title,
      slug: testRow.slug,
      categoryId: testRow.category_id,
      categoryName: 'Domain Assessment',
      description: testRow.description || '',
      durationMinutes: testRow.duration_minutes,
      difficulty: testRow.difficulty === 'easy' ? 'Beginner' : testRow.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
      totalMarks: testRow.total_marks,
      isPublished: testRow.is_published,
      totalAttempts: testRow.total_attempts || 0,
      rating: Number(testRow.rating) || 4.8,
      createdAt: testRow.created_at,
      questions: studentQuestions,
    };
  },

  // Alias used by instructions view
  async getTestById(testIdOrSlug: string): Promise<QuizTest | null> {
    return this.getStudentTestById(testIdOrSlug);
  },

  // ----------------------------------------------------------------------------
  // CRITICAL SECURITY REQUIREMENT:
  // Server-Side Validated Quiz Answer Submission
  // ----------------------------------------------------------------------------
  async submitQuiz(
    test: QuizTest,
    answers: Record<string, OptionId>,
    timeSpentSeconds: number
  ): Promise<QuizSubmission> {
    const timeAllocatedSeconds = test.durationMinutes * 60;
    const finalTimeSpent = Math.min(Math.max(timeSpentSeconds, 1), timeAllocatedSeconds);

    if (isSupabaseConfigured()) {
      const client = supabase!;
      // Call server-side RPC `submit_quiz_answers`
      // The database evaluates correctness against the hidden answer keys and returns verified scorecard
      const { data, error } = await client.rpc('submit_quiz_answers', {
        p_test_id: test.id,
        p_answers: answers,
        p_time_taken_seconds: finalTimeSpent,
      });

      if (error) {
        throw new Error(`Server-side test submission error: ${error.message}`);
      }

      const submission = data as QuizSubmission;
      this.saveSubmissionToStorage(submission);
      this.clearActiveSession(test.id);
      return submission;
    }

    // Local / unconfigured fallback: evaluate using full local question keys
    const fullTest = localTests.find((t) => t.id === test.id || t.slug === test.slug) || test;
    const fullQuestions = fullTest.questions as Question[];

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let attemptedCount = 0;

    const questionResults: QuestionResult[] = fullQuestions.map((q) => {
      const userAnswer = answers[q.id] || null;
      const isAttempted = userAnswer !== null;
      const isCorrect = isAttempted && userAnswer === q.correctOptionId;

      if (isAttempted) {
        attemptedCount += 1;
        if (isCorrect) {
          correctCount += 1;
          score += q.marks;
        } else {
          wrongCount += 1;
        }
      }

      return {
        questionId: q.id,
        questionNumber: q.questionNumber,
        text: q.text,
        options: q.options,
        userAnswer,
        correctAnswer: q.correctOptionId || 'A',
        isCorrect,
        isAttempted,
        marksAwarded: isCorrect ? q.marks : 0,
        explanation: q.explanation || 'Answer verified by QuizRay curriculum.',
      };
    });

    const totalQuestions = fullQuestions.length;
    const unattemptedCount = totalQuestions - attemptedCount;
    const maxScore = test.totalMarks || totalQuestions;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const submission: QuizSubmission = {
      testId: test.id,
      testTitle: test.title,
      categoryName: test.categoryName,
      totalQuestions,
      attemptedCount,
      unattemptedCount,
      correctCount,
      wrongCount,
      score,
      maxScore,
      percentage,
      timeAllocatedSeconds,
      timeTakenSeconds: finalTimeSpent,
      submittedAt: new Date().toISOString(),
      answers,
      questionResults,
    };

    this.saveSubmissionToStorage(submission);
    this.clearActiveSession(test.id);
    return submission;
  },

  // ----------------------------------------------------------------------------
  // Session & Local Storage Operations
  // ----------------------------------------------------------------------------
  saveActiveSession(state: QuizSessionStorageState): void {
    try {
      sessionStorage.setItem(`${SESSION_PREFIX}${state.testId}`, JSON.stringify(state));
    } catch {
      // Ignore
    }
  },

  loadActiveSession(testId: string): QuizSessionStorageState | null {
    try {
      const raw = sessionStorage.getItem(`${SESSION_PREFIX}${testId}`);
      if (!raw) return null;
      return JSON.parse(raw) as QuizSessionStorageState;
    } catch {
      return null;
    }
  },

  clearActiveSession(testId: string): void {
    try {
      sessionStorage.removeItem(`${SESSION_PREFIX}${testId}`);
    } catch {
      // Ignore
    }
  },

  saveSubmissionToStorage(submission: QuizSubmission): void {
    try {
      sessionStorage.setItem(`${SUBMISSION_PREFIX}${submission.testId}`, JSON.stringify(submission));
      sessionStorage.setItem(LATEST_SUBMISSION_KEY, JSON.stringify(submission));

      // Also persist to local history registry for local/offline playback
      const submissionId = submission.submissionId || `sub-local-${Date.now()}`;
      submission.submissionId = submissionId;
      const historyRaw = localStorage.getItem(LOCAL_HISTORY_KEY);
      const historyList: QuizSubmission[] = historyRaw ? JSON.parse(historyRaw) : [];
      const filtered = historyList.filter((item) => item.submissionId !== submissionId);
      filtered.unshift(submission);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(filtered.slice(0, 100)));
    } catch {
      // Ignore
    }
  },

  getLatestSubmission(testId?: string): QuizSubmission | null {
    try {
      if (testId) {
        const raw = sessionStorage.getItem(`${SUBMISSION_PREFIX}${testId}`);
        if (raw) return JSON.parse(raw) as QuizSubmission;
      }
      const latestRaw = sessionStorage.getItem(LATEST_SUBMISSION_KEY);
      if (latestRaw) return JSON.parse(latestRaw) as QuizSubmission;
      return null;
    } catch {
      return null;
    }
  },

  // ----------------------------------------------------------------------------
  // Authenticated Student Operations (Test History)
  // ----------------------------------------------------------------------------
  async getUserQuizHistory(limit: number = 20, offset: number = 0): Promise<TestHistoryItem[]> {
    if (!isSupabaseConfigured()) {
      try {
        const historyRaw = localStorage.getItem(LOCAL_HISTORY_KEY);
        if (!historyRaw) return [];
        const fullSubmissions: QuizSubmission[] = JSON.parse(historyRaw);
        return fullSubmissions.slice(offset, offset + limit).map((s) => ({
          id: s.submissionId || s.testId,
          testId: s.testId,
          testTitle: s.testTitle,
          categoryName: s.categoryName,
          score: s.score,
          maxScore: s.maxScore,
          percentage: s.percentage,
          totalQuestions: s.totalQuestions,
          attemptedCount: s.attemptedCount,
          correctCount: s.correctCount,
          wrongCount: s.wrongCount,
          timeTakenSeconds: s.timeTakenSeconds,
          submittedAt: s.submittedAt,
        }));
      } catch {
        return [];
      }
    }

    const client = supabase!;
    const { data, error } = await client.rpc('get_user_quiz_history', {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw new Error(`Failed to load quiz history: ${error.message}`);
    }

    return (data || []) as TestHistoryItem[];
  },

  async getHistoricalSubmission(submissionId: string): Promise<QuizSubmission | null> {
    if (!submissionId) return null;

    if (!isSupabaseConfigured()) {
      try {
        const historyRaw = localStorage.getItem(LOCAL_HISTORY_KEY);
        if (!historyRaw) return null;
        const fullSubmissions: QuizSubmission[] = JSON.parse(historyRaw);
        return fullSubmissions.find((s) => s.submissionId === submissionId || s.testId === submissionId) || null;
      } catch {
        return null;
      }
    }

    const client = supabase!;
    const { data, error } = await client.rpc('get_submission_for_user', {
      p_submission_id: submissionId,
    });

    if (error) {
      throw new Error(`Failed to load historical submission: ${error.message}`);
    }

    return (data as QuizSubmission) || null;
  },

  async getUserPerformanceAnalytics(): Promise<PerformanceAnalytics> {
    if (!isSupabaseConfigured()) {
      return {
        overview: {
          total_tests: 0,
          avg_score: 0,
          avg_percentage: 0,
          overall_accuracy: 0,
          total_correct: 0,
          total_wrong: 0,
          total_attempted: 0,
          total_questions: 0,
          best_percentage: 0,
          total_time_taken_seconds: 0,
          avg_time_per_test_seconds: 0,
          avg_time_per_question_seconds: 0,
          time_utilization_percentage: 0,
        },
        score_trend: [],
        category_performance: [],
        difficulty_performance: [],
        weak_areas: [],
        recent_tests: [],
      };
    }

    const client = supabase!;
    const { data, error } = await client.rpc('get_user_performance_analytics');

    if (error) {
      throw new Error(`Failed to load performance analytics: ${error.message}`);
    }

    return data as PerformanceAnalytics;
  },

  getPerformanceFeedback(percentage: number) {
    if (percentage >= 80) {
      return {
        badge: 'Excellent Mastery',
        title: 'Outstanding Performance!',
        message: 'You demonstrated strong conceptual command across the questions in this assessment.',
        color: 'emerald' as const,
      };
    }
    if (percentage >= 60) {
      return {
        badge: 'Good Effort',
        title: 'Solid Understanding!',
        message: 'You have a good grasp of the material with room to review a few missed concepts.',
        color: 'blue' as const,
      };
    }
    if (percentage >= 40) {
      return {
        badge: 'Needs Revision',
        title: 'Foundational Knowledge Present',
        message: 'Review the question explanations below to strengthen your understanding before retesting.',
        color: 'amber' as const,
      };
    }
    return {
      badge: 'Needs Focus',
      title: 'Practice Recommended',
      message: 'Take time to study the detailed explanations below to build confidence in this topic.',
      color: 'rose' as const,
    };
  },

  // ----------------------------------------------------------------------------
  // ADMIN FOUNDATION OPERATIONS (Protected Server-Side by RLS is_admin())
  // ----------------------------------------------------------------------------
  async adminGetDashboardStats(): Promise<AdminStats> {
    if (!isSupabaseConfigured()) {
      const totalCategories = localCategories.length;
      const totalTests = localTests.length;
      const publishedTests = localTests.filter((t) => t.isPublished !== false).length;
      const totalQuestions = localTests.reduce((acc, t) => acc + t.questions.length, 0);

      return {
        totalCategories,
        totalTests,
        publishedTests,
        totalQuestions,
        totalSubmissions: 24,
        isSupabaseConnected: false,
      };
    }

    const client = supabase!;
    const [catRes, testRes, pubRes, qRes, subCountRes] = await Promise.all([
      client.from('categories').select('*', { count: 'exact', head: true }),
      client.from('tests').select('*', { count: 'exact', head: true }),
      client.from('tests').select('*', { count: 'exact', head: true }).eq('is_published', true),
      client.from('questions').select('*', { count: 'exact', head: true }),
      client.rpc('get_admin_submission_count'),
    ]);

    if (catRes.error || testRes.error || pubRes.error || qRes.error) {
      const err = catRes.error || testRes.error || pubRes.error || qRes.error;
      throw new Error(`Admin stats query failed: ${err?.message}`);
    }

    return {
      totalCategories: catRes.count || 0,
      totalTests: testRes.count || 0,
      publishedTests: pubRes.count || 0,
      totalQuestions: qRes.count || 0,
      totalSubmissions: typeof subCountRes.data === 'number' ? subCountRes.data : 0,
      isSupabaseConnected: true,
    };
  },

  async adminGetAllTests(): Promise<QuizTest[]> {
    if (!isSupabaseConfigured()) {
      return localTests;
    }

    const client = supabase!;
    const { data, error } = await client
      .from('tests')
      .select('*, categories(name, slug)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Admin test fetch failed: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      categoryId: row.category_id,
      categoryName: row.categories?.name || 'General',
      description: row.description || '',
      durationMinutes: row.duration_minutes,
      difficulty: row.difficulty === 'easy' ? 'Beginner' : row.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
      totalMarks: row.total_marks,
      isPublished: row.is_published,
      totalAttempts: row.total_attempts || 0,
      rating: Number(row.rating) || 4.8,
      createdAt: row.created_at,
      questions: [],
    }));
  },

  async adminCreateTest(formData: AdminTestFormData): Promise<QuizTest> {
    const difficultyDb = formData.difficulty === 'Beginner' ? 'easy' : formData.difficulty === 'Advanced' ? 'hard' : 'medium';

    if (!isSupabaseConfigured()) {
      const newTest: QuizTest = {
        id: `test-${formData.slug || Date.now()}`,
        title: formData.title,
        slug: formData.slug || `test-${Date.now()}`,
        categoryId: formData.categoryId,
        categoryName: localCategories.find((c) => c.id === formData.categoryId)?.name || 'General',
        description: formData.description,
        durationMinutes: formData.durationMinutes,
        difficulty: formData.difficulty,
        totalMarks: formData.totalMarks,
        isPublished: formData.isPublished,
        totalAttempts: 0,
        rating: 5.0,
        createdAt: new Date().toISOString(),
        questions: [],
      };
      localTests.unshift(newTest);
      return newTest;
    }

    const client = supabase!;
    const { data, error } = await client
      .from('tests')
      .insert({
        title: formData.title,
        slug: formData.slug,
        category_id: formData.categoryId,
        description: formData.description,
        duration_minutes: formData.durationMinutes,
        difficulty: difficultyDb,
        total_marks: formData.totalMarks,
        is_published: formData.isPublished,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      categoryId: data.category_id,
      categoryName: 'General',
      description: data.description || '',
      durationMinutes: data.duration_minutes,
      difficulty: formData.difficulty,
      totalMarks: data.total_marks,
      isPublished: data.is_published,
      totalAttempts: 0,
      rating: 5.0,
      createdAt: data.created_at,
      questions: [],
    };
  },

  async adminUpdateTest(testId: string, updates: Partial<AdminTestFormData>): Promise<QuizTest> {
    if (!isSupabaseConfigured()) {
      localTests = localTests.map((t) => {
        if (t.id === testId) {
          return {
            ...t,
            ...updates,
            difficulty: updates.difficulty || t.difficulty,
            isPublished: updates.isPublished !== undefined ? updates.isPublished : t.isPublished,
          };
        }
        return t;
      });
      const updated = localTests.find((t) => t.id === testId);
      if (!updated) throw new Error('Test not found');
      return updated;
    }

    const client = supabase!;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
    if (updates.difficulty !== undefined) {
      payload.difficulty = updates.difficulty === 'Beginner' ? 'easy' : updates.difficulty === 'Advanced' ? 'hard' : 'medium';
    }
    if (updates.totalMarks !== undefined) payload.total_marks = updates.totalMarks;
    if (updates.isPublished !== undefined) payload.is_published = updates.isPublished;

    const { data, error } = await client
      .from('tests')
      .update(payload)
      .eq('id', testId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update test: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      categoryId: data.category_id,
      categoryName: 'General',
      description: data.description || '',
      durationMinutes: data.duration_minutes,
      difficulty: updates.difficulty || 'Intermediate',
      totalMarks: data.total_marks,
      isPublished: data.is_published,
      totalAttempts: 0,
      rating: 5.0,
      createdAt: data.created_at,
      questions: [],
    };
  },

  async adminTogglePublishTest(testId: string, isPublished: boolean): Promise<void> {
    if (!isSupabaseConfigured()) {
      localTests = localTests.map((t) => (t.id === testId ? { ...t, isPublished } : t));
      return;
    }

    const client = supabase!;
    const { error } = await client
      .from('tests')
      .update({ is_published: isPublished, updated_at: new Date().toISOString() })
      .eq('id', testId);

    if (error) {
      throw new Error(`Failed to toggle test publish status: ${error.message}`);
    }
  },

  async adminDeleteTest(testId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      localTests = localTests.filter((t) => t.id !== testId);
      return;
    }

    const client = supabase!;
    const { error } = await client.from('tests').delete().eq('id', testId);

    if (error) {
      throw new Error(`Failed to delete test: ${error.message}`);
    }
  },

  async adminGetQuestionsByTest(testId: string): Promise<Question[]> {
    if (!isSupabaseConfigured()) {
      const test = localTests.find((t) => t.id === testId || t.slug === testId);
      return (test?.questions as Question[]) || [];
    }

    const client = supabase!;
    const { data, error } = await client
      .from('questions')
      .select('*, options(*)')
      .eq('test_id', testId)
      .order('question_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch test questions: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      testId: row.test_id,
      questionNumber: row.question_number,
      text: row.question_text,
      correctOptionId: row.correct_option_id,
      explanation: row.explanation,
      difficulty: row.difficulty === 'easy' ? 'Beginner' : row.difficulty === 'hard' ? 'Advanced' : 'Intermediate',
      marks: row.marks,
      options: (row.options || [])
        .map((o: { option_key: OptionId; option_text: string }) => ({
          id: o.option_key,
          text: o.option_text,
        }))
        .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)),
    }));
  },

  async adminCreateQuestion(formData: AdminQuestionFormData): Promise<Question> {
    const difficultyDb = formData.difficulty === 'Beginner' ? 'easy' : formData.difficulty === 'Advanced' ? 'hard' : 'medium';
    const computedQNumber =
      formData.questionNumber ||
      (localTests.find((t) => t.id === formData.testId)?.questions.length || 0) + 1;

    if (!isSupabaseConfigured()) {
      const newQuestion: Question = {
        id: `q-${Date.now()}`,
        testId: formData.testId,
        questionNumber: computedQNumber,
        text: formData.text,
        options: [
          { id: 'A', text: formData.optionA },
          { id: 'B', text: formData.optionB },
          { id: 'C', text: formData.optionC },
          { id: 'D', text: formData.optionD },
        ],
        correctOptionId: formData.correctOptionId,
        explanation: formData.explanation,
        difficulty: formData.difficulty,
        marks: formData.marks,
      };

      localTests = localTests.map((t) => {
        if (t.id === formData.testId) {
          return { ...t, questions: [...t.questions, newQuestion] };
        }
        return t;
      });

      return newQuestion;
    }

    const client = supabase!;
    // 1. Insert question
    const { data: qData, error: qError } = await client
      .from('questions')
      .insert({
        test_id: formData.testId,
        question_number: computedQNumber,
        question_text: formData.text,
        correct_option_id: formData.correctOptionId,
        explanation: formData.explanation,
        difficulty: difficultyDb,
        marks: formData.marks,
      })
      .select()
      .single();

    if (qError) {
      throw new Error(`Failed to create question: ${qError.message}`);
    }

    // 2. Insert 4 options
    const optionsPayload = [
      { question_id: qData.id, option_key: 'A', option_text: formData.optionA },
      { question_id: qData.id, option_key: 'B', option_text: formData.optionB },
      { question_id: qData.id, option_key: 'C', option_text: formData.optionC },
      { question_id: qData.id, option_key: 'D', option_text: formData.optionD },
    ];

    const { error: optError } = await client.from('options').insert(optionsPayload);
    if (optError) {
      throw new Error(`Failed to insert question options: ${optError.message}`);
    }

    return {
      id: qData.id,
      testId: qData.test_id,
      questionNumber: qData.question_number,
      text: qData.question_text,
      correctOptionId: qData.correct_option_id,
      explanation: qData.explanation,
      difficulty: formData.difficulty,
      marks: qData.marks,
      options: [
        { id: 'A', text: formData.optionA },
        { id: 'B', text: formData.optionB },
        { id: 'C', text: formData.optionC },
        { id: 'D', text: formData.optionD },
      ],
    };
  },

  async adminUpdateQuestion(questionId: string, updates: Partial<AdminQuestionFormData>): Promise<Question> {
    if (!isSupabaseConfigured()) {
      let updatedQuestion: Question | null = null;
      localTests = localTests.map((t) => {
        return {
          ...t,
          questions: t.questions.map((q) => {
            if (q.id === questionId) {
              const fullQ = q as Question;
              const uOptA = updates.optionA ?? q.options.find((o) => o.id === 'A')?.text ?? '';
              const uOptB = updates.optionB ?? q.options.find((o) => o.id === 'B')?.text ?? '';
              const uOptC = updates.optionC ?? q.options.find((o) => o.id === 'C')?.text ?? '';
              const uOptD = updates.optionD ?? q.options.find((o) => o.id === 'D')?.text ?? '';
              updatedQuestion = {
                id: q.id,
                testId: q.testId,
                questionNumber: q.questionNumber,
                text: updates.text ?? q.text,
                difficulty: updates.difficulty ?? q.difficulty,
                marks: updates.marks ?? q.marks,
                correctOptionId: updates.correctOptionId ?? fullQ.correctOptionId ?? 'A',
                explanation: updates.explanation ?? fullQ.explanation ?? '',
                options: [
                  { id: 'A', text: uOptA },
                  { id: 'B', text: uOptB },
                  { id: 'C', text: uOptC },
                  { id: 'D', text: uOptD },
                ],
              };
              return updatedQuestion;
            }
            return q;
          }),
        };
      });
      if (!updatedQuestion) throw new Error('Question not found');
      return updatedQuestion;
    }

    const client = supabase!;
    const qPayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.text !== undefined) qPayload.question_text = updates.text;
    if (updates.correctOptionId !== undefined) qPayload.correct_option_id = updates.correctOptionId;
    if (updates.explanation !== undefined) qPayload.explanation = updates.explanation;
    if (updates.marks !== undefined) qPayload.marks = updates.marks;
    if (updates.difficulty !== undefined) {
      qPayload.difficulty = updates.difficulty === 'Beginner' ? 'easy' : updates.difficulty === 'Advanced' ? 'hard' : 'medium';
    }

    const { data: qData, error: qError } = await client
      .from('questions')
      .update(qPayload)
      .eq('id', questionId)
      .select()
      .single();

    if (qError) {
      throw new Error(`Failed to update question: ${qError.message}`);
    }

    // Update options if provided
    if (updates.optionA || updates.optionB || updates.optionC || updates.optionD) {
      if (updates.optionA) {
        await client.from('options').update({ option_text: updates.optionA }).eq('question_id', questionId).eq('option_key', 'A');
      }
      if (updates.optionB) {
        await client.from('options').update({ option_text: updates.optionB }).eq('question_id', questionId).eq('option_key', 'B');
      }
      if (updates.optionC) {
        await client.from('options').update({ option_text: updates.optionC }).eq('question_id', questionId).eq('option_key', 'C');
      }
      if (updates.optionD) {
        await client.from('options').update({ option_text: updates.optionD }).eq('question_id', questionId).eq('option_key', 'D');
      }
    }

    return {
      id: qData.id,
      testId: qData.test_id,
      questionNumber: qData.question_number,
      text: qData.question_text,
      correctOptionId: qData.correct_option_id,
      explanation: qData.explanation,
      difficulty: updates.difficulty || 'Intermediate',
      marks: qData.marks,
      options: [
        { id: 'A', text: updates.optionA || '' },
        { id: 'B', text: updates.optionB || '' },
        { id: 'C', text: updates.optionC || '' },
        { id: 'D', text: updates.optionD || '' },
      ],
    };
  },

  async adminDeleteQuestion(questionId: string, testId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      localTests = localTests.map((t) => {
        if (t.id === testId) {
          return { ...t, questions: t.questions.filter((q) => q.id !== questionId) };
        }
        return t;
      });
      return;
    }

    const client = supabase!;
    const { error } = await client.from('questions').delete().eq('id', questionId);
    if (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }
  },

  // ----------------------------------------------------------------------------
  // ADMIN CATEGORY OPERATIONS
  // ----------------------------------------------------------------------------
  async adminGetAllCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured()) {
      return localCategories;
    }

    const client = supabase!;
    const { data, error } = await client
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch admin categories: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      iconName: (row.icon || 'computer') as Category['iconName'],
      testCount: 0,
      orderIndex: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  },

  async adminCreateCategory(formData: AdminCategoryFormData): Promise<Category> {
    if (!isSupabaseConfigured()) {
      const newCat: Category = {
        id: `cat-${formData.slug || Date.now()}`,
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        iconName: (formData.icon || formData.iconName || 'computer') as Category['iconName'],
        testCount: 0,
        orderIndex: formData.sortOrder ?? formData.displayOrder ?? 1,
        isActive: formData.isActive !== false,
        createdAt: new Date().toISOString(),
      };
      localCategories.push(newCat);
      return newCat;
    }

    const client = supabase!;
    const { data, error } = await client
      .from('categories')
      .insert({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        icon: formData.icon || formData.iconName || 'computer',
        is_active: formData.isActive !== false,
        sort_order: formData.sortOrder ?? formData.displayOrder ?? 1,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      iconName: (data.icon || 'computer') as Category['iconName'],
      testCount: 0,
      orderIndex: data.sort_order,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  },

  async adminToggleCategoryActive(categoryId: string, isActive: boolean): Promise<void> {
    if (!isSupabaseConfigured()) {
      localCategories = localCategories.map((c) =>
        c.id === categoryId ? { ...c, isActive } : c
      );
      return;
    }

    const client = supabase!;
    const { error } = await client
      .from('categories')
      .update({ is_active: isActive })
      .eq('id', categoryId);

    if (error) {
      throw new Error(`Failed to toggle category status: ${error.message}`);
    }
  },

  async adminDeleteCategory(categoryId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      localCategories = localCategories.filter((c) => c.id !== categoryId);
      return;
    }

    const client = supabase!;
    const { error } = await client.from('categories').delete().eq('id', categoryId);
    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  },

  async adminUpdateCategory(categoryId: string, updates: Partial<AdminCategoryFormData>): Promise<Category> {
    if (!isSupabaseConfigured()) {
      localCategories = localCategories.map((c) => {
        if (c.id === categoryId) {
          return {
            ...c,
            name: updates.name ?? c.name,
            slug: updates.slug ?? c.slug,
            description: updates.description ?? c.description,
            iconName: (updates.iconName || updates.icon || c.iconName) as Category['iconName'],
            orderIndex: updates.sortOrder ?? updates.displayOrder ?? c.orderIndex,
            isActive: updates.isActive ?? c.isActive,
          };
        }
        return c;
      });
      const cat = localCategories.find((c) => c.id === categoryId);
      if (!cat) throw new Error('Category not found');
      return cat;
    }

    const client = supabase!;
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.iconName !== undefined || updates.icon !== undefined) payload.icon = updates.iconName || updates.icon;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.sortOrder !== undefined || updates.displayOrder !== undefined) {
      payload.sort_order = updates.sortOrder ?? updates.displayOrder;
    }

    const { data, error } = await client
      .from('categories')
      .update(payload)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      iconName: (data.icon || 'computer') as Category['iconName'],
      testCount: 0,
      orderIndex: data.sort_order,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  },

  // ----------------------------------------------------------------------------
  // ADMIN CONVENIENCE ALIASES
  // ----------------------------------------------------------------------------
  getAdminStats(): Promise<AdminStats> {
    return this.adminGetDashboardStats();
  },

  createTest(formData: AdminTestFormData): Promise<QuizTest> {
    return this.adminCreateTest(formData);
  },

  updateTest(testId: string, updates: Partial<AdminTestFormData>): Promise<QuizTest> {
    return this.adminUpdateTest(testId, updates);
  },

  deleteTest(testId: string): Promise<void> {
    return this.adminDeleteTest(testId);
  },

  getAdminQuestions(testId: string): Promise<Question[]> {
    return this.adminGetQuestionsByTest(testId);
  },

  createQuestion(formData: AdminQuestionFormData): Promise<Question> {
    return this.adminCreateQuestion(formData);
  },

  updateQuestion(questionId: string, updates: Partial<AdminQuestionFormData>): Promise<Question> {
    return this.adminUpdateQuestion(questionId, updates);
  },

  deleteQuestion(questionId: string, testId?: string): Promise<void> {
    return this.adminDeleteQuestion(questionId, testId || '');
  },

  createCategory(formData: AdminCategoryFormData): Promise<Category> {
    return this.adminCreateCategory(formData);
  },

  updateCategory(categoryId: string, updates: Partial<AdminCategoryFormData>): Promise<Category> {
    return this.adminUpdateCategory(categoryId, updates);
  },

  deleteCategory(categoryId: string): Promise<void> {
    return this.adminDeleteCategory(categoryId);
  },

  // ----------------------------------------------------------------------------
  // Question Bank Operations (Phase Q2)
  // ----------------------------------------------------------------------------

  /**
   * Question Bank: List questions with filters, search, and pagination
   * Calls RPC: public.admin_get_question_bank
   */
  async getAdminQuestionBank(
    filters: QuestionBankFilters
  ): Promise<QuestionBankListResponse> {
    if (!isSupabaseConfigured()) {
      return {
        items: [],
        totalCount: 0,
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        totalPages: 0,
      };
    }

    const client = supabase!;

    // Normalize search: trimmed, < 2 chars => null
    const rawSearch = (filters.search || '').trim();
    const searchParam = rawSearch.length >= 2 ? rawSearch : null;

    // Normalize filters: 'all' or empty string => null
    const normalizeFilter = (val?: string | null) => {
      if (!val || val === 'all' || val.trim() === '') return null;
      return val.trim();
    };

    const rpcParams = {
      p_search: searchParam,
      p_category_id: normalizeFilter(filters.categoryId),
      p_status: normalizeFilter(filters.status),
      p_difficulty: normalizeFilter(filters.difficulty),
      p_subject: normalizeFilter(filters.subject),
      p_topic: normalizeFilter(filters.topic),
      p_exam_type: normalizeFilter(filters.examType),
      p_source_type: normalizeFilter(filters.sourceType),
      p_language: normalizeFilter(filters.language),
      p_page: Math.max(1, filters.page || 1),
      p_page_size: Math.min(100, Math.max(1, filters.pageSize || 20)),
    };

    const { data, error } = await client.rpc('admin_get_question_bank', rpcParams);

    if (error) {
      throw new Error(`Failed to fetch Question Bank: ${error.message}`);
    }

    const raw = (data || {}) as {
      items?: any[];
      total_count?: number;
      page?: number;
      page_size?: number;
      total_pages?: number;
    };

    return {
      items: (raw.items || []).map(mapRawQuestionBankListItem),
      totalCount: raw.total_count || 0,
      page: raw.page || filters.page || 1,
      pageSize: raw.page_size || filters.pageSize || 20,
      totalPages: raw.total_pages || 0,
    };
  },

  /**
   * Question Bank: Get complete question details including 4 options and linked tests
   * Calls RPC: public.admin_get_question_bank_item
   */
  async getAdminQuestionBankItem(
    questionId: string
  ): Promise<QuestionBankDetail> {
    const trimmedId = (questionId || '').trim();
    if (!trimmedId) {
      throw new Error('Question ID is required');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Live Supabase connection required to fetch Question Bank detail');
    }

    const client = supabase!;
    const { data, error } = await client.rpc('admin_get_question_bank_item', {
      p_question_id: trimmedId,
    });

    if (error) {
      throw new Error(`Failed to fetch Question Bank item: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Question not found: ${trimmedId}`);
    }

    return mapRawQuestionBankDetail(data);
  },

  /**
   * Question Bank: Atomically create or update a question and its 4 options
   * Calls RPC: public.admin_save_question
   */
  async saveAdminQuestion(
    input: QuestionBankSaveInput
  ): Promise<QuestionBankDetail> {
    if (!isSupabaseConfigured()) {
      throw new Error('Live Supabase connection required to save Question Bank questions');
    }

    // Validate required fields
    if (!input.categoryId?.trim()) {
      throw new Error('Category is required');
    }
    if (!input.questionText?.trim() || input.questionText.trim().length < 10) {
      throw new Error('Question text must be at least 10 characters long');
    }
    if (!['easy', 'medium', 'hard'].includes(input.difficulty)) {
      throw new Error('Difficulty must be easy, medium, or hard');
    }
    if (!input.marks || input.marks < 1) {
      throw new Error('Marks must be at least 1');
    }
    if (!['A', 'B', 'C', 'D'].includes(input.correctOptionId)) {
      throw new Error('Correct option must be A, B, C, or D');
    }
    if (!Array.isArray(input.options) || input.options.length !== 4) {
      throw new Error('Exactly 4 options (A, B, C, D) are required');
    }

    const optionsPayload = input.options.map((opt) => ({
      option_key: opt.optionKey,
      option_text: opt.optionText.trim(),
    }));

    const client = supabase!;
    const rpcParams = {
      p_category_id: input.categoryId.trim(),
      p_question_text: input.questionText.trim(),
      p_difficulty: input.difficulty,
      p_marks: input.marks,
      p_correct_option_id: input.correctOptionId,
      p_explanation: (input.explanation || '').trim(),
      p_options: optionsPayload,
      p_status: input.status || 'draft',
      p_question_id: input.questionId ? input.questionId.trim() : null,
      p_subject: input.subject?.trim() || null,
      p_topic: input.topic?.trim() || null,
      p_exam_type: input.examType?.trim() || null,
      p_exam_name: input.examName?.trim() || null,
      p_exam_year: input.examYear || null,
      p_source_type: input.sourceType || 'curriculum',
      p_source_reference: input.sourceReference?.trim() || null,
      p_language: input.language?.trim() || 'en',
      p_verification_notes: input.verificationNotes?.trim() || null,
    };

    const { data, error } = await client.rpc('admin_save_question', rpcParams);

    if (error) {
      throw new Error(`Failed to save question: ${error.message}`);
    }

    return mapRawQuestionBankDetail(data);
  },

  /**
   * Question Bank: Soft-archive a question
   * Calls RPC: public.admin_archive_question
   */
  async archiveAdminQuestion(
    questionId: string
  ): Promise<QuestionBankActionResult> {
    const trimmedId = (questionId || '').trim();
    if (!trimmedId) {
      throw new Error('Question ID is required');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Live Supabase connection required to archive Question Bank questions');
    }

    const client = supabase!;
    const { data, error } = await client.rpc('admin_archive_question', {
      p_question_id: trimmedId,
    });

    if (error) {
      throw new Error(`Failed to archive question: ${error.message}`);
    }

    return data as QuestionBankActionResult;
  },

  /**
   * Question Bank: Permanently delete an isolated question with 0 test links and 0 submissions
   * Calls RPC: public.admin_delete_question
   */
  async deleteAdminQuestion(
    questionId: string
  ): Promise<QuestionBankActionResult> {
    const trimmedId = (questionId || '').trim();
    if (!trimmedId) {
      throw new Error('Question ID is required');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Live Supabase connection required to delete Question Bank questions');
    }

    const client = supabase!;
    const { data, error } = await client.rpc('admin_delete_question', {
      p_question_id: trimmedId,
    });

    if (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }

    return data as QuestionBankActionResult;
  },

  // ----------------------------------------------------------------------------
  // Phase Q3: Question Bank Bulk Import Operations
  // ----------------------------------------------------------------------------

  /**
   * Phase Q3: Parse an uploaded CSV or XLSX spreadsheet into raw ImportRow records.
   * Pure client-side parsing; does not touch database or mutate state.
   */
  async parseQuestionImportFile(file: File): Promise<ParseImportFileResult> {
    return parseImportFile(file);
  },

  /**
   * Phase Q3: Collect existing Question Bank question content hashes for duplicate detection.
   * Uses the existing authenticated Q2 RPC admin_get_question_bank with pagination (pageSize: 100).
   * Zero DDL, zero new RPCs, zero N+1 queries.
   */
  async getExistingQuestionBankContentHashes(): Promise<Set<string>> {
    const hashes = new Set<string>();
    if (!isSupabaseConfigured()) {
      return hashes;
    }

    let currentPage = 1;
    let totalPages = 1;
    const MAX_PAGES = 500; // Defensive loop termination guard (up to 50,000 questions)

    try {
      do {
        const response = await this.getAdminQuestionBank({
          search: '',
          categoryId: 'all',
          status: 'all',
          difficulty: 'all',
          subject: 'all',
          topic: 'all',
          examType: 'all',
          sourceType: 'all',
          language: 'all',
          page: currentPage,
          pageSize: 100,
        });

        if (!response.items || response.items.length === 0) {
          break;
        }

        for (const item of response.items) {
          if (item.contentHash) {
            hashes.add(item.contentHash.toLowerCase().trim());
          } else if (item.questionText) {
            const computed = await computeContentHash(item.questionText);
            hashes.add(computed.toLowerCase().trim());
          }
        }

        totalPages = response.totalPages;
        currentPage++;
      } while (currentPage <= totalPages && currentPage <= MAX_PAGES);

      return hashes;
    } catch (err) {
      throw new Error(
        `Failed to retrieve existing questions for duplicate detection: ${
          err instanceof Error ? err.message : 'Database query failed'
        }`
      );
    }
  },

  /**
   * Phase Q3: Validate parsed import rows against QuizRay domain rules, category registry,
   * in-file duplicates, and live database content hashes.
   * Pure client-side validation; does not mutate database state.
   */
  async validateQuestionImport(
    rows: ImportRow[],
    categories?: AvailableCategory[],
    existingContentHashes?: Set<string>
  ): Promise<ValidateImportResult> {
    // Retrieve active categories if not passed by caller
    let resolvedCategories: AvailableCategory[];
    if (categories && categories.length > 0) {
      resolvedCategories = categories;
    } else {
      const dbCategories = await this.getCategories();
      resolvedCategories = dbCategories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        isActive: c.isActive,
      }));
    }

    // Retrieve existing content hashes using the existing paginated Q2 read path if not provided
    const resolvedHashes =
      existingContentHashes !== undefined
        ? existingContentHashes
        : await this.getExistingQuestionBankContentHashes();

    return validateImportRows({
      rows,
      categories: resolvedCategories,
      existingContentHashes: resolvedHashes,
    });
  },

  /**
   * Phase Q3: Execute bulk insertion of approved, valid, non-duplicate questions into the Question Bank.
   * Reuses the existing public.admin_save_question RPC for each approved item.
   * Strictly handles per-row success/failure without partial silent corruption.
   */
  async bulkImportQuestions(
    approvedRows: ImportParsedRow[],
    onProgress?: (processedCount: number, totalCount: number) => void
  ): Promise<ImportExecutionResult> {
    const totalAttempted = approvedRows.length;
    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: ImportRowError[] = [];

    for (let i = 0; i < approvedRows.length; i++) {
      const row = approvedRows[i];

      // Safety check: Only import rows that are valid, have normalized data, and are not duplicates
      if (!row.isValid || !row.normalizedData || row.duplicateType !== 'none') {
        skippedCount++;
        if (onProgress) {
          onProgress(i + 1, totalAttempted);
        }
        continue;
      }

      // Defense-in-depth safety guard:
      // AI-assisted + published must never be inserted directly as published
      if (
        row.normalizedData.sourceType === 'ai_assisted' &&
        row.normalizedData.status === 'published'
      ) {
        failedCount++;
        errors.push({
          rowNumber: row.rowNumber,
          field: 'status',
          code: 'ERR_AI_PUBLISHED_BLOCKED',
          severity: 'error',
          message:
            'AI-assisted questions cannot be imported directly as Published. They must be created as Draft or Under Review.',
          suggestedCorrection: "Change status to 'draft' or 'under_review'.",
        });
        if (onProgress) {
          onProgress(i + 1, totalAttempted);
        }
        continue;
      }

      try {
        await this.saveAdminQuestion(row.normalizedData);
        importedCount++;
      } catch (err) {
        failedCount++;
        errors.push({
          rowNumber: row.rowNumber,
          field: 'server',
          code: 'ERR_SERVER_INSERT_FAILED',
          severity: 'error',
          message: err instanceof Error ? err.message : 'Server rejected question insertion',
          suggestedCorrection: 'Check server error message or database constraints',
        });
      }

      if (onProgress) {
        onProgress(i + 1, totalAttempted);
      }
    }

    return {
      totalAttempted,
      importedCount,
      skippedCount,
      failedCount,
      errors,
      isComplete: true,
    };
  },
};

// ----------------------------------------------------------------------------
// Question Bank Mappers (Internal Helpers)
// ----------------------------------------------------------------------------
function mapRawQuestionBankListItem(q: any): QuestionBankListItem {
  return {
    id: q.id,
    categoryId: q.category_id,
    categoryName: q.category_name || 'Unassigned',
    categoryIcon: q.category_icon || null,
    questionText: q.question_text || '',
    difficulty: q.difficulty,
    marks: q.marks,
    status: q.status,
    subject: q.subject || null,
    topic: q.topic || null,
    examType: q.exam_type || null,
    examName: q.exam_name || null,
    examYear: q.exam_year || null,
    sourceType: q.source_type,
    sourceReference: q.source_reference || null,
    language: q.language || 'en',
    createdBy: q.created_by || null,
    verifiedBy: q.verified_by || null,
    isVerified: Boolean(q.is_verified),
    contentHash: q.content_hash || null,
    linkedTestsCount: q.linked_tests_count || 0,
    optionsCount: q.options_count || 0,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  };
}

function mapRawQuestionBankDetail(q: any): QuestionBankDetail {
  return {
    id: q.id,
    categoryId: q.category_id,
    categoryName: q.category_name || 'Unassigned',
    categoryIcon: q.category_icon || null,
    questionText: q.question_text || '',
    difficulty: q.difficulty,
    marks: q.marks,
    status: q.status,
    subject: q.subject || null,
    topic: q.topic || null,
    examType: q.exam_type || null,
    examName: q.exam_name || null,
    examYear: q.exam_year || null,
    sourceType: q.source_type,
    sourceReference: q.source_reference || null,
    language: q.language || 'en',
    correctOptionId: q.correct_option_id,
    explanation: q.explanation || '',
    createdBy: q.created_by || null,
    verifiedBy: q.verified_by || null,
    isVerified: Boolean(q.is_verified),
    verificationNotes: q.verification_notes || null,
    contentHash: q.content_hash || null,
    options: (q.options || []).map((o: any) => ({
      id: o.id,
      optionKey: o.option_key,
      optionText: o.option_text,
    })),
    linkedTests: (q.linked_tests || []).map((t: any) => ({
      testId: t.test_id,
      testTitle: t.test_title,
      isPublished: Boolean(t.is_published),
      questionNumber: t.question_number,
      marks: t.marks,
    })),
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  };
}

