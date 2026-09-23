-- ==============================================================================
-- QuizRay Database Migration: Phase Q1
-- Question Bank Architecture & Assessment Decoupling
-- ==============================================================================
-- Transactional and rollback-safe migration.
-- Minimizes locking and downtime; asserts relational integrity at every stage.
-- ==============================================================================

-- 1. Add Question Bank Columns to public.questions
-- (All columns initially nullable or with safe defaults for seamless backfill)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'under_review', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS exam_type TEXT,
  ADD COLUMN IF NOT EXISTS exam_name TEXT,
  ADD COLUMN IF NOT EXISTS exam_year INT,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'curriculum' CHECK (source_type IN ('official_exam', 'textbook', 'curriculum', 'ai_assisted', 'original')),
  ADD COLUMN IF NOT EXISTS source_reference TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 2. Backfill status for existing verified production questions
UPDATE public.questions
SET status = 'published'
WHERE status IS NULL;

-- 3. Lock status column: NOT NULL with DEFAULT 'draft' for all future questions
ALTER TABLE public.questions
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft';

-- 4. Backfill category_id for existing questions from their parent test
UPDATE public.questions q
SET category_id = t.category_id
FROM public.tests t
WHERE q.test_id = t.id
AND q.category_id IS NULL;

-- 5. Strict Category Integrity Assertions
DO $$
DECLARE
  v_orphan_count INT;
  v_invalid_cat_count INT;
  v_unlinked_count INT;
BEGIN
  -- Assert 1: Zero NULL category_id values
  SELECT COUNT(*)::INT INTO v_orphan_count
  FROM public.questions
  WHERE category_id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Category backfill validation failed: % questions have NULL category_id', v_orphan_count;
  END IF;

  -- Assert 2: Every category_id references an existing, active category
  SELECT COUNT(*)::INT INTO v_invalid_cat_count
  FROM public.questions q
  LEFT JOIN public.categories c ON c.id = q.category_id
  WHERE c.id IS NULL OR c.is_active <> true;

  IF v_invalid_cat_count > 0 THEN
    RAISE EXCEPTION 'Category backfill validation failed: % questions reference non-existent or inactive categories', v_invalid_cat_count;
  END IF;

  -- Assert 3: Every existing question has a valid legacy test relationship
  SELECT COUNT(*)::INT INTO v_unlinked_count
  FROM public.questions q
  LEFT JOIN public.tests t ON t.id = q.test_id
  WHERE q.test_id IS NOT NULL AND t.id IS NULL;

  IF v_unlinked_count > 0 THEN
    RAISE EXCEPTION 'Legacy test linkage validation failed: % questions reference non-existent tests', v_unlinked_count;
  END IF;
END $$;

-- 6. Lock category_id column: NOT NULL
ALTER TABLE public.questions
  ALTER COLUMN category_id SET NOT NULL;

-- 7. Compute content_hash for existing questions using exact schema-qualified extensions.digest()
UPDATE public.questions
SET content_hash = encode(extensions.digest(lower(regexp_replace(trim(question_text), '\s+', ' ', 'g')), 'sha256'), 'hex')
WHERE content_hash IS NULL;

-- 8. Create public.test_questions junction table
-- (Strict pre-existence check: aborts if table already exists to avoid unexpected collisions)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'test_questions'
  ) THEN
    RAISE EXCEPTION 'Table public.test_questions already exists. Aborting to avoid unexpected schema collisions.';
  END IF;
END $$;

CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_number INT NOT NULL CHECK (question_number > 0),
  marks INT NOT NULL CHECK (marks > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_test_questions_test_question UNIQUE (test_id, question_id),
  CONSTRAINT uq_test_questions_test_number UNIQUE (test_id, question_number)
);

-- 9. Backfill test_questions from existing questions
INSERT INTO public.test_questions (test_id, question_id, question_number, marks, created_at)
SELECT test_id, id, question_number, marks, created_at
FROM public.questions
WHERE test_id IS NOT NULL;

-- 10. STRICT BIDIRECTIONAL VALIDATION
DO $$
DECLARE
  v_expected_count INT;
  v_actual_count INT;
  v_missing_or_mismatched INT;
  v_extra_rows INT;
BEGIN
  -- Condition C: Count parity check
  SELECT COUNT(*)::INT INTO v_expected_count
  FROM public.questions
  WHERE test_id IS NOT NULL;

  SELECT COUNT(*)::INT INTO v_actual_count
  FROM public.test_questions;

  IF v_expected_count <> v_actual_count THEN
    RAISE EXCEPTION 'Junction backfill validation failed: count mismatch (expected %, found %)',
      v_expected_count, v_actual_count;
  END IF;

  -- Condition A: Forward check - every legacy question has exactly one matching junction row
  SELECT COUNT(*)::INT INTO v_missing_or_mismatched
  FROM public.questions q
  LEFT JOIN public.test_questions tq
    ON tq.test_id = q.test_id
   AND tq.question_id = q.id
   AND tq.question_number = q.question_number
   AND tq.marks = q.marks
  WHERE q.test_id IS NOT NULL
    AND tq.id IS NULL;

  IF v_missing_or_mismatched > 0 THEN
    RAISE EXCEPTION 'Junction backfill validation failed: % legacy question relationships missing or mismatched in test_questions',
      v_missing_or_mismatched;
  END IF;

  -- Condition B: Reverse check - test_questions contains NO extra or unlinked rows
  SELECT COUNT(*)::INT INTO v_extra_rows
  FROM public.test_questions tq
  LEFT JOIN public.questions q
    ON q.id = tq.question_id
   AND q.test_id = tq.test_id
   AND q.question_number = tq.question_number
   AND q.marks = tq.marks
  WHERE q.id IS NULL;

  IF v_extra_rows > 0 THEN
    RAISE EXCEPTION 'Junction backfill validation failed: % extra or unlinked rows found in test_questions',
      v_extra_rows;
  END IF;

  -- Condition D: Invariants guaranteed by UNIQUE(test_id, question_id) and UNIQUE(test_id, question_number)
END $$;

-- 11. PUBLISHED TEST / QUESTION INTEGRITY VALIDATION (Migration-time check)
-- Invariant: published test + linked question => published question
DO $$
DECLARE
  v_invalid_published_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_invalid_published_count
  FROM public.tests t
  JOIN public.test_questions tq ON tq.test_id = t.id
  JOIN public.questions q ON q.id = tq.question_id
  WHERE t.is_published = true
    AND q.status <> 'published';

  IF v_invalid_published_count > 0 THEN
    RAISE EXCEPTION 'Published test integrity validation failed: % questions linked to published tests have non-published status',
      v_invalid_published_count;
  END IF;
END $$;

-- 12. Safely decouple questions from tests
-- (test_id becomes legacy/origin reference only; loosen constraints)
ALTER TABLE public.questions
  ALTER COLUMN test_id DROP NOT NULL;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_test_id_fkey;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_test_id_fkey
  FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE SET NULL;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_test_id_question_number_key;

-- 13. Add AI-assisted verification database constraint
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS chk_ai_assisted_verified;

ALTER TABLE public.questions
  ADD CONSTRAINT chk_ai_assisted_verified CHECK (
    source_type <> 'ai_assisted'
    OR status <> 'published'
    OR verified_by IS NOT NULL
  );

-- 14. Create Question Lifecycle & Security Trigger (SECURITY DEFINER, strict search_path)
-- Enforces:
-- A. created_by server-derivation
-- B. content_hash and updated_at maintenance
-- C. AI verification before publication
-- D. Admin verification on publication
-- E. Invariant: Cannot demote a question to non-published if linked to ANY published test
CREATE OR REPLACE FUNCTION public.enforce_question_lifecycle()
RETURNS trigger AS $$
BEGIN
  -- 1. Always maintain content_hash using exact schema-qualified extensions.digest()
  NEW.content_hash := encode(extensions.digest(lower(regexp_replace(trim(NEW.question_text), '\s+', ' ', 'g')), 'sha256'), 'hex');
  
  -- 2. Always maintain updated_at
  NEW.updated_at := now();

  -- 3. FUTURE INVARIANT (LEGACY FALLBACK): Cannot link a non-published question to a published test via questions.test_id
  IF NEW.test_id IS NOT NULL AND NEW.status <> 'published' THEN
    IF EXISTS (
      SELECT 1 FROM public.tests WHERE id = NEW.test_id AND is_published = true
    ) THEN
      RAISE EXCEPTION 'Cannot link non-published question % (status: %) to published test % via test_id',
        COALESCE(NEW.id::text, 'new'), NEW.status, NEW.test_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Server-derive created_by; never trust client-supplied value
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
    ELSE
      NEW.created_by := NULL;
    END IF;

    -- AI-assisted questions must start as draft
    IF NEW.source_type = 'ai_assisted' AND NEW.status = 'published' THEN
      RAISE EXCEPTION 'AI-assisted questions must be created as draft and verified before publication';
    END IF;

    -- If inserted as published, requires admin privileges and server-derived verified_by
    IF NEW.status = 'published' THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can publish questions';
      END IF;
      NEW.verified_by := auth.uid();
    ELSE
      NEW.verified_by := NULL;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Transitioning from non-published -> 'published' (draft -> published, under_review -> published)
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status <> 'published') THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can publish questions';
      END IF;
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Cannot publish question without active administrator session';
      END IF;
      -- Server-enforced derivation of verified_by from auth.uid()
      NEW.verified_by := auth.uid();
    END IF;

    -- Transitioning from 'published' -> non-published (published -> draft, under_review, archived)
    -- FUTURE INVARIANT: A question CANNOT be demoted if linked to ANY published test
    IF NEW.status <> 'published' AND OLD.status = 'published' THEN
      IF (
        EXISTS (
          SELECT 1 FROM public.test_questions tq
          JOIN public.tests t ON t.id = tq.test_id
          WHERE tq.question_id = NEW.id AND t.is_published = true
        ) OR EXISTS (
          SELECT 1 FROM public.tests t
          WHERE t.id = NEW.test_id AND t.is_published = true
        )
      ) THEN
        RAISE EXCEPTION 'Cannot unpublish question %: it is currently linked to one or more published tests', NEW.id;
      END IF;
      NEW.verified_by := NULL;
    END IF;

    -- Updating a question that remains 'published' (published -> published)
    IF NEW.status = 'published' AND OLD.status = 'published' THEN
      -- Disallow changing source_type to ai_assisted on an already published question
      IF NEW.source_type = 'ai_assisted' AND OLD.source_type <> 'ai_assisted' THEN
        RAISE EXCEPTION 'Cannot change source_type to ai_assisted on an already published question';
      END IF;
      -- Preserve existing verification
      NEW.verified_by := COALESCE(OLD.verified_by, auth.uid());
    END IF;

    -- Invariant check: AI-assisted questions cannot be published without verified_by
    IF NEW.source_type = 'ai_assisted' AND NEW.status = 'published' AND NEW.verified_by IS NULL THEN
      RAISE EXCEPTION 'AI-assisted questions require verified_by to be published';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_questions_lifecycle ON public.questions;
CREATE TRIGGER trg_questions_lifecycle
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_question_lifecycle();

-- 15. FUTURE INVARIANT: Enforce that test_questions cannot link a non-published question to a published test
CREATE OR REPLACE FUNCTION public.enforce_test_questions_published_invariant()
RETURNS trigger AS $$
DECLARE
  v_is_test_published BOOLEAN;
  v_question_status TEXT;
BEGIN
  -- Check if destination test is published
  SELECT is_published INTO v_is_test_published
  FROM public.tests
  WHERE id = NEW.test_id;

  IF v_is_test_published = true THEN
    SELECT status INTO v_question_status
    FROM public.questions
    WHERE id = NEW.question_id;

    IF v_question_status IS NULL OR v_question_status <> 'published' THEN
      RAISE EXCEPTION 'Cannot link non-published question % (status: %) to published test %',
        NEW.question_id, COALESCE(v_question_status, 'unknown'), NEW.test_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_test_questions_published_invariant ON public.test_questions;
CREATE TRIGGER trg_test_questions_published_invariant
  BEFORE INSERT OR UPDATE ON public.test_questions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_test_questions_published_invariant();

-- 16. FUTURE INVARIANT: Enforce that tests cannot be published if they contain any non-published questions
CREATE OR REPLACE FUNCTION public.enforce_test_published_questions_invariant()
RETURNS trigger AS $$
DECLARE
  v_unpublished_count INT;
BEGIN
  -- Triggered when an assessment transitions to is_published = true
  IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
    -- Check test_questions junction
    SELECT COUNT(*)::INT INTO v_unpublished_count
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
    WHERE tq.test_id = NEW.id AND q.status <> 'published';

    IF v_unpublished_count > 0 THEN
      RAISE EXCEPTION 'Cannot publish test %: it contains % linked questions with non-published status',
        NEW.id, v_unpublished_count;
    END IF;

    -- Check legacy fallback questions if test has zero test_questions rows
    IF NOT EXISTS (SELECT 1 FROM public.test_questions WHERE test_id = NEW.id) THEN
      SELECT COUNT(*)::INT INTO v_unpublished_count
      FROM public.questions q
      WHERE q.test_id = NEW.id AND q.status <> 'published';

      IF v_unpublished_count > 0 THEN
        RAISE EXCEPTION 'Cannot publish test %: it contains % legacy questions with non-published status',
          NEW.id, v_unpublished_count;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_tests_published_questions_invariant ON public.tests;
CREATE TRIGGER trg_tests_published_questions_invariant
  BEFORE UPDATE OF is_published ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_test_published_questions_invariant();

-- 17. Create Targeted Indexes
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_content_hash ON public.questions(content_hash);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id, question_number);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON public.test_questions(question_id);

-- 18. Enable RLS and Configure Strict Least-Privilege Grants on test_questions
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.test_questions FROM anon, authenticated, PUBLIC;

DROP POLICY IF EXISTS "Admins can manage test_questions" ON public.test_questions;
CREATE POLICY "Admins can manage test_questions"
  ON public.test_questions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view test_questions of published tests" ON public.test_questions;
CREATE POLICY "Public can view test_questions of published tests"
  ON public.test_questions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests
      WHERE tests.id = test_questions.test_id
      AND (tests.is_published = true OR public.is_admin())
    )
  );

GRANT SELECT ON public.test_questions TO anon, authenticated;

-- 19. Update get_test_for_student RPC
-- (Primary: test_questions; Legacy Fallback: questions.test_id)
-- (Excludes correct_option_id, explanation, and admin metadata from students)
CREATE OR REPLACE FUNCTION public.get_test_for_student(p_slug_or_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_test RECORD;
  v_questions JSONB;
  v_has_test_questions BOOLEAN;
BEGIN
  -- Lookup test by slug or UUID (only published tests unless caller is admin)
  SELECT * INTO v_test FROM public.tests
  WHERE (slug = p_slug_or_id OR id::text = p_slug_or_id)
  AND (is_published = true OR public.is_admin());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check if test uses test_questions junction
  SELECT EXISTS (
    SELECT 1 FROM public.test_questions WHERE test_id = v_test.id
  ) INTO v_has_test_questions;

  IF v_has_test_questions THEN
    -- PRIMARY PATH: test_questions -> questions
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'test_id', v_test.id,
          'question_number', tq.question_number,
          'text', q.question_text,
          'difficulty', q.difficulty,
          'marks', tq.marks, -- Authoritative test-specific marks
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
            FROM public.options o WHERE o.question_id = q.id
          )
        ) ORDER BY tq.question_number
      ),
      '[]'::jsonb
    ) INTO v_questions
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
    WHERE tq.test_id = v_test.id
    AND (q.status = 'published' OR public.is_admin());
  ELSE
    -- LEGACY FALLBACK: questions.test_id (activated only when test has zero test_questions rows)
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
            FROM public.options o WHERE o.question_id = q.id
          )
        ) ORDER BY q.question_number
      ),
      '[]'::jsonb
    ) INTO v_questions
    FROM public.questions q
    WHERE q.test_id = v_test.id
    AND (q.status = 'published' OR public.is_admin());
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 20. Update submit_quiz_answers RPC
-- (Enforces published test validation; scores using authoritative test_questions.marks)
CREATE OR REPLACE FUNCTION public.submit_quiz_answers(
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
  v_has_test_questions BOOLEAN;
BEGIN
  -- Verify test exists and is published (or caller is admin)
  -- CRITICAL SECURITY SHIELD: Blocks unauthorized scoring or answer leakage for unpublished tests
  SELECT t.*, c.name AS category_name
  INTO v_test
  FROM public.tests t
  JOIN public.categories c ON c.id = t.category_id
  WHERE t.id = p_test_id
  AND (t.is_published = true OR public.is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found: %', p_test_id;
  END IF;

  v_category_name := v_test.category_name;
  v_time_allocated_seconds := v_test.duration_minutes * 60;

  -- Check if test uses test_questions junction
  SELECT EXISTS (
    SELECT 1 FROM public.test_questions WHERE test_id = p_test_id
  ) INTO v_has_test_questions;

  IF v_has_test_questions THEN
    -- PRIMARY PATH: test_questions -> questions
    FOR v_question IN
      SELECT
        q.id,
        q.correct_option_id,
        q.explanation,
        q.question_text,
        tq.question_number,
        tq.marks, -- Authoritative test-specific marks
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
      FROM public.test_questions tq
      JOIN public.questions q ON q.id = tq.question_id
      LEFT JOIN public.options o ON o.question_id = q.id
      WHERE tq.test_id = p_test_id
      AND (q.status = 'published' OR public.is_admin())
      GROUP BY q.id, q.correct_option_id, q.explanation, q.question_text, tq.question_number, tq.marks
      ORDER BY tq.question_number
    LOOP
      v_total_questions := v_total_questions + 1;
      v_max_score := v_max_score + v_question.marks;

      v_user_answer := p_answers->>v_question.id::text;
      IF v_user_answer IS NULL THEN
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
  ELSE
    -- LEGACY FALLBACK: questions.test_id
    FOR v_question IN
      SELECT
        q.id,
        q.correct_option_id,
        q.explanation,
        q.question_text,
        q.question_number,
        q.marks,
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
      FROM public.questions q
      LEFT JOIN public.options o ON o.question_id = q.id
      WHERE q.test_id = p_test_id
      AND (q.status = 'published' OR public.is_admin())
      GROUP BY q.id, q.correct_option_id, q.explanation, q.question_text, q.question_number, q.marks
      ORDER BY q.question_number
    LOOP
      v_total_questions := v_total_questions + 1;
      v_max_score := v_max_score + v_question.marks;

      v_user_answer := p_answers->>v_question.id::text;
      IF v_user_answer IS NULL THEN
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
  END IF;

  v_unattempted_count := v_total_questions - v_attempted_count;
  IF v_max_score > 0 THEN
    v_percentage := ROUND((v_score::NUMERIC / v_max_score::NUMERIC) * 100);
  ELSE
    v_percentage := 0;
  END IF;

  -- Insert verified submission record into database
  INSERT INTO public.submissions (
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
  UPDATE public.tests SET total_attempts = total_attempts + 1 WHERE id = p_test_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 21. Function Execution Grants
REVOKE EXECUTE ON FUNCTION public.get_test_for_student(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_test_for_student(TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_quiz_answers(UUID, JSONB, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_answers(UUID, JSONB, INT) TO anon, authenticated;
