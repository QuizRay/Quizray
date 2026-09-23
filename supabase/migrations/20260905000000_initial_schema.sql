-- ==============================================================================
-- QuizRay Database Schema & Security Migration
-- Phase 2: Real Supabase Relational Database + Server-Side Security
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'computer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- ------------------------------------------------------------------------------
-- 2. TESTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 10 CHECK (duration_minutes > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  total_marks INT NOT NULL DEFAULT 5 CHECK (total_marks > 0),
  is_published BOOLEAN NOT NULL DEFAULT true,
  total_attempts INT NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 4.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tests_category_id ON tests(category_id);
CREATE INDEX IF NOT EXISTS idx_tests_slug ON tests(slug);
CREATE INDEX IF NOT EXISTS idx_tests_is_published ON tests(is_published);

-- ------------------------------------------------------------------------------
-- 3. QUESTIONS TABLE (Contains Answer Keys & Explanations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  correct_option_id TEXT NOT NULL CHECK (correct_option_id IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  marks INT NOT NULL DEFAULT 1 CHECK (marks > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(test_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);

-- ------------------------------------------------------------------------------
-- 4. OPTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D')),
  option_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, option_key)
);

CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);

-- ------------------------------------------------------------------------------
-- 5. SUBMISSIONS TABLE (Calculated Server-Side)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  total_questions INT NOT NULL,
  attempted_count INT NOT NULL,
  unattempted_count INT NOT NULL,
  correct_count INT NOT NULL,
  wrong_count INT NOT NULL,
  score INT NOT NULL,
  max_score INT NOT NULL,
  percentage INT NOT NULL,
  time_allocated_seconds INT NOT NULL,
  time_taken_seconds INT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  question_results JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_submissions_test_id ON submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);

-- ------------------------------------------------------------------------------
-- 6. ADMIN USERS TABLE (Server-Side Authorization Registry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. SECURITY FUNCTIONS & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Admin check helper function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Categories RLS Policies
DROP POLICY IF EXISTS "Public can view active categories" ON categories;
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Tests RLS Policies
DROP POLICY IF EXISTS "Public can view published tests" ON tests;
CREATE POLICY "Public can view published tests"
  ON tests FOR SELECT
  USING (is_published = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage tests" ON tests;
CREATE POLICY "Admins can manage tests"
  ON tests FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Questions RLS Policies
-- CRITICAL SECURITY CORRECTION: Direct SELECT on questions table is restricted to admins!
-- Students obtain questions solely via `get_test_for_student` RPC which strips correct_option_id & explanation.
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Options RLS Policies
DROP POLICY IF EXISTS "Public can view options of published tests" ON options;
CREATE POLICY "Public can view options of published tests"
  ON options FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM questions
      JOIN tests ON tests.id = questions.test_id
      WHERE questions.id = options.question_id
      AND tests.is_published = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage options" ON options;
CREATE POLICY "Admins can manage options"
  ON options FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Submissions RLS Policies
-- Submissions can only be inserted via the server-side RPC `submit_quiz_answers`
DROP POLICY IF EXISTS "Users can read own submissions" ON submissions;
CREATE POLICY "Users can read own submissions"
  ON submissions FOR SELECT
  USING (
    is_admin() OR
    user_id = auth.uid() OR
    user_id IS NULL
  );

DROP POLICY IF EXISTS "Admins can manage submissions" ON submissions;
CREATE POLICY "Admins can manage submissions"
  ON submissions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin Users RLS Policies
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (is_admin() OR user_id = auth.uid());

-- ==============================================================================
-- 8. SECURE RPC FUNCTIONS
-- ==============================================================================

-- RPC 1: Fetch published test and questions for students
-- Explicitly omits correct_option_id and explanation from unsubmitted students
CREATE OR REPLACE FUNCTION get_test_for_student(p_slug_or_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_test RECORD;
  v_questions JSONB;
BEGIN
  -- Lookup test by slug or UUID
  SELECT * INTO v_test FROM tests
  WHERE (slug = p_slug_or_id OR id::text = p_slug_or_id)
  AND (is_published = true OR is_admin());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Aggregate questions without correct_option_id or explanation
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'test_id', q.test_id,
        'question_number', q.question_number,
        'text', q.question_text,
        'difficulty', q.difficulty,
        'marks', q.marks,
        'options', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', o.option_key,
                'option_key', o.option_key,
                'text', o.option_text
              ) ORDER BY o.option_key
            ),
            '[]'::jsonb
          )
          FROM options o WHERE o.question_id = q.id
        )
      ) ORDER BY q.question_number
    ),
    '[]'::jsonb
  ) INTO v_questions
  FROM questions q
  WHERE q.test_id = v_test.id;

  RETURN jsonb_build_object(
    'id', v_test.id,
    'category_id', v_test.category_id,
    'title', v_test.title,
    'slug', v_test.slug,
    'description', v_test.description,
    'duration_minutes', v_test.duration_minutes,
    'difficulty', v_test.difficulty,
    'total_marks', v_test.total_marks,
    'is_published', v_test.is_published,
    'rating', v_test.rating,
    'total_attempts', v_test.total_attempts,
    'created_at', v_test.created_at,
    'questions', v_questions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: Secure Server-Side Quiz Answer Submission
-- Evaluates answers on the server, verifies correctness, calculates score, and saves to database
CREATE OR REPLACE FUNCTION submit_quiz_answers(
  p_test_id UUID,
  p_answers JSONB,
  p_time_taken_seconds INT
)
RETURNS JSONB AS $$
DECLARE
  v_test RECORD;
  v_question RECORD;
  v_total_questions INT := 0;
  v_attempted_count INT := 0;
  v_unattempted_count INT := 0;
  v_correct_count INT := 0;
  v_wrong_count INT := 0;
  v_score INT := 0;
  v_max_score INT := 0;
  v_percentage INT := 0;
  v_time_allocated_seconds INT := 0;
  v_question_results JSONB := '[]'::jsonb;
  v_user_answer TEXT;
  v_is_attempted BOOLEAN;
  v_is_correct BOOLEAN;
  v_submission_id UUID;
  v_category_name TEXT;
BEGIN
  -- Verify test exists and is published
  SELECT t.*, c.name AS category_name
  INTO v_test
  FROM tests t
  JOIN categories c ON c.id = t.category_id
  WHERE t.id = p_test_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found: %', p_test_id;
  END IF;

  v_category_name := v_test.category_name;
  v_time_allocated_seconds := v_test.duration_minutes * 60;

  -- Evaluate each question server-side against the real database correct_option_id
  FOR v_question IN
    SELECT q.*,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', o.option_key,
            'option_key', o.option_key,
            'text', o.option_text
          ) ORDER BY o.option_key
        ),
        '[]'::jsonb
      ) AS options_list
    FROM questions q
    LEFT JOIN options o ON o.question_id = q.id
    WHERE q.test_id = p_test_id
    GROUP BY q.id
    ORDER BY q.question_number
  LOOP
    v_total_questions := v_total_questions + 1;
    v_max_score := v_max_score + v_question.marks;

    -- Extract user's answer for this question
    v_user_answer := p_answers->>v_question.id::text;
    IF v_user_answer IS NULL THEN
      -- Also check if answer was keyed by string question_number or slug
      v_user_answer := p_answers->>v_question.question_number::text;
    END IF;

    v_is_attempted := (v_user_answer IS NOT NULL AND v_user_answer <> '');
    v_is_correct := (v_is_attempted AND v_user_answer = v_question.correct_option_id);

    IF v_is_attempted THEN
      v_attempted_count := v_attempted_count + 1;
      IF v_is_correct THEN
        v_correct_count := v_correct_count + 1;
        v_score := v_score + v_question.marks;
      ELSE
        v_wrong_count := v_wrong_count + 1;
      END IF;
    END IF;

    -- Append verified result (NOW including correct answer & explanation for post-submission review)
    v_question_results := v_question_results || jsonb_build_object(
      'questionId', v_question.id,
      'questionNumber', v_question.question_number,
      'text', v_question.question_text,
      'options', v_question.options_list,
      'userAnswer', v_user_answer,
      'correctAnswer', v_question.correct_option_id,
      'isCorrect', v_is_correct,
      'isAttempted', v_is_attempted,
      'marksAwarded', CASE WHEN v_is_correct THEN v_question.marks ELSE 0 END,
      'explanation', v_question.explanation
    );
  END LOOP;

  v_unattempted_count := v_total_questions - v_attempted_count;
  IF v_max_score > 0 THEN
    v_percentage := ROUND((v_score::NUMERIC / v_max_score::NUMERIC) * 100);
  ELSE
    v_percentage := 0;
  END IF;

  -- Insert verified submission record into database
  INSERT INTO submissions (
    test_id,
    user_id,
    total_questions,
    attempted_count,
    unattempted_count,
    correct_count,
    wrong_count,
    score,
    max_score,
    percentage,
    time_allocated_seconds,
    time_taken_seconds,
    answers,
    question_results,
    submitted_at
  ) VALUES (
    p_test_id,
    auth.uid(),
    v_total_questions,
    v_attempted_count,
    v_unattempted_count,
    v_correct_count,
    v_wrong_count,
    v_score,
    v_max_score,
    v_percentage,
    v_time_allocated_seconds,
    LEAST(GREATEST(p_time_taken_seconds, 1), v_time_allocated_seconds),
    p_answers,
    v_question_results,
    now()
  )
  RETURNING id INTO v_submission_id;

  -- Increment test attempts count
  UPDATE tests SET total_attempts = total_attempts + 1 WHERE id = p_test_id;

  -- Return complete scorecard to student
  RETURN jsonb_build_object(
    'submissionId', v_submission_id,
    'testId', p_test_id,
    'testTitle', v_test.title,
    'categoryName', v_category_name,
    'totalQuestions', v_total_questions,
    'attemptedCount', v_attempted_count,
    'unattemptedCount', v_unattempted_count,
    'correctCount', v_correct_count,
    'wrongCount', v_wrong_count,
    'score', v_score,
    'maxScore', v_max_score,
    'percentage', v_percentage,
    'timeAllocatedSeconds', v_time_allocated_seconds,
    'timeTakenSeconds', LEAST(GREATEST(p_time_taken_seconds, 1), v_time_allocated_seconds),
    'submittedAt', now(),
    'answers', p_answers,
    'questionResults', v_question_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 9. PERMISSIONS & ROLE GRANTS
-- Grants required by PostgreSQL for public API access (governed by RLS policies)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON tests TO anon, authenticated;
GRANT SELECT ON options TO anon, authenticated;
GRANT SELECT ON submissions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_test_for_student(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_quiz_answers(UUID, JSONB, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;
