-- ==============================================================================
-- QuizRay Database Migration: Phase Q2
-- Administrative Question Bank Management RPCs
-- ==============================================================================
-- Additive migration: Defines 5 dedicated, atomic, SECURITY DEFINER stored
-- procedures for administrative Question Bank querying, authoring, and lifecycle.
-- Does not alter existing table structures or modify student endpoints.
-- ==============================================================================

-- 1. RPC: List Question Bank Items (Lightweight, Filtered, Paginated)
CREATE OR REPLACE FUNCTION public.admin_get_question_bank(
  p_search TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_topic TEXT DEFAULT NULL,
  p_exam_type TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_search TEXT;
  v_page INT;
  v_page_size INT;
  v_offset INT;
  v_total_count INT := 0;
  v_total_pages INT := 0;
  v_items JSONB := '[]'::jsonb;
BEGIN
  -- Security check: Require authenticated admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  -- Normalize pagination parameters
  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_offset := (v_page - 1) * v_page_size;

  -- Normalize search parameter (trimmed, minimum 2 characters)
  v_search := trim(p_search);
  IF length(v_search) < 2 THEN
    v_search := NULL;
  END IF;

  -- Count total matching records
  SELECT COUNT(*)::INT INTO v_total_count
  FROM public.questions q
  LEFT JOIN public.categories c ON c.id = q.category_id
  WHERE (p_category_id IS NULL OR q.category_id = p_category_id)
    AND (p_status IS NULL OR p_status = 'all' OR q.status = p_status)
    AND (p_difficulty IS NULL OR p_difficulty = 'all' OR q.difficulty = p_difficulty)
    AND (p_subject IS NULL OR p_subject = 'all' OR q.subject = p_subject)
    AND (p_topic IS NULL OR p_topic = 'all' OR q.topic = p_topic)
    AND (p_exam_type IS NULL OR p_exam_type = 'all' OR q.exam_type = p_exam_type)
    AND (p_source_type IS NULL OR p_source_type = 'all' OR q.source_type = p_source_type)
    AND (p_language IS NULL OR p_language = 'all' OR q.language = p_language)
    AND (
      v_search IS NULL OR (
        q.question_text ILIKE '%' || v_search || '%' OR
        COALESCE(q.subject, '') ILIKE '%' || v_search || '%' OR
        COALESCE(q.topic, '') ILIKE '%' || v_search || '%' OR
        COALESCE(q.exam_name, '') ILIKE '%' || v_search || '%' OR
        COALESCE(q.exam_type, '') ILIKE '%' || v_search || '%'
      )
    );

  IF v_total_count > 0 THEN
    v_total_pages := CEIL(v_total_count::NUMERIC / v_page_size::NUMERIC)::INT;

    -- Fetch lightweight rows
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'category_id', q.category_id,
          'category_name', COALESCE(c.name, 'Unassigned'),
          'category_icon', c.icon,
          'question_text', CASE 
            WHEN length(q.question_text) > 160 THEN left(q.question_text, 157) || '...'
            ELSE q.question_text
          END,
          'difficulty', q.difficulty,
          'marks', q.marks,
          'status', q.status,
          'subject', q.subject,
          'topic', q.topic,
          'exam_type', q.exam_type,
          'exam_name', q.exam_name,
          'exam_year', q.exam_year,
          'source_type', q.source_type,
          'source_reference', q.source_reference,
          'language', q.language,
          'created_by', q.created_by,
          'verified_by', q.verified_by,
          'is_verified', (q.verified_by IS NOT NULL),
          'content_hash', q.content_hash,
          'linked_tests_count', (
            SELECT COUNT(*)::INT
            FROM public.test_questions tq
            WHERE tq.question_id = q.id
          ),
          'options_count', (
            SELECT COUNT(*)::INT
            FROM public.options o
            WHERE o.question_id = q.id
          ),
          'created_at', q.created_at,
          'updated_at', q.updated_at
        ) ORDER BY q.created_at DESC
      ),
      '[]'::jsonb
    ) INTO v_items
    FROM (
      SELECT q.*
      FROM public.questions q
      LEFT JOIN public.categories c ON c.id = q.category_id
      WHERE (p_category_id IS NULL OR q.category_id = p_category_id)
        AND (p_status IS NULL OR p_status = 'all' OR q.status = p_status)
        AND (p_difficulty IS NULL OR p_difficulty = 'all' OR q.difficulty = p_difficulty)
        AND (p_subject IS NULL OR p_subject = 'all' OR q.subject = p_subject)
        AND (p_topic IS NULL OR p_topic = 'all' OR q.topic = p_topic)
        AND (p_exam_type IS NULL OR p_exam_type = 'all' OR q.exam_type = p_exam_type)
        AND (p_source_type IS NULL OR p_source_type = 'all' OR q.source_type = p_source_type)
        AND (p_language IS NULL OR p_language = 'all' OR q.language = p_language)
        AND (
          v_search IS NULL OR (
            q.question_text ILIKE '%' || v_search || '%' OR
            COALESCE(q.subject, '') ILIKE '%' || v_search || '%' OR
            COALESCE(q.topic, '') ILIKE '%' || v_search || '%' OR
            COALESCE(q.exam_name, '') ILIKE '%' || v_search || '%' OR
            COALESCE(q.exam_type, '') ILIKE '%' || v_search || '%'
          )
        )
      ORDER BY q.created_at DESC
      LIMIT v_page_size
      OFFSET v_offset
    ) q
    LEFT JOIN public.categories c ON c.id = q.category_id;
  END IF;

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', v_total_count,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2. RPC: Get Full Question Bank Item Details
CREATE OR REPLACE FUNCTION public.admin_get_question_bank_item(
  p_question_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_question RECORD;
  v_options JSONB;
  v_linked_tests JSONB;
BEGIN
  -- Security check: Require authenticated admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  -- Fetch question record
  SELECT q.*, c.name AS category_name, c.icon AS category_icon
  INTO v_question
  FROM public.questions q
  LEFT JOIN public.categories c ON c.id = q.category_id
  WHERE q.id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found: %', p_question_id;
  END IF;

  -- Fetch options
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'option_key', o.option_key,
        'option_text', o.option_text
      ) ORDER BY o.option_key
    ),
    '[]'::jsonb
  ) INTO v_options
  FROM public.options o
  WHERE o.question_id = p_question_id;

  -- Fetch linked tests from junction table
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'test_id', t.id,
        'test_title', t.title,
        'is_published', t.is_published,
        'question_number', tq.question_number,
        'marks', tq.marks
      ) ORDER BY t.title
    ),
    '[]'::jsonb
  ) INTO v_linked_tests
  FROM public.test_questions tq
  JOIN public.tests t ON t.id = tq.test_id
  WHERE tq.question_id = p_question_id;

  RETURN jsonb_build_object(
    'id', v_question.id,
    'category_id', v_question.category_id,
    'category_name', COALESCE(v_question.category_name, 'Unassigned'),
    'category_icon', v_question.category_icon,
    'question_text', v_question.question_text,
    'difficulty', v_question.difficulty,
    'marks', v_question.marks,
    'status', v_question.status,
    'subject', v_question.subject,
    'topic', v_question.topic,
    'exam_type', v_question.exam_type,
    'exam_name', v_question.exam_name,
    'exam_year', v_question.exam_year,
    'source_type', v_question.source_type,
    'source_reference', v_question.source_reference,
    'language', v_question.language,
    'correct_option_id', v_question.correct_option_id,
    'explanation', v_question.explanation,
    'created_by', v_question.created_by,
    'verified_by', v_question.verified_by,
    'is_verified', (v_question.verified_by IS NOT NULL),
    'verification_notes', v_question.verification_notes,
    'content_hash', v_question.content_hash,
    'options', v_options,
    'linked_tests', v_linked_tests,
    'created_at', v_question.created_at,
    'updated_at', v_question.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 3. RPC: Atomically Save / Upsert Question Bank Item with 4 Options
CREATE OR REPLACE FUNCTION public.admin_save_question(
  p_category_id UUID,
  p_question_text TEXT,
  p_difficulty TEXT,
  p_marks INT,
  p_correct_option_id TEXT,
  p_explanation TEXT,
  p_options JSONB,
  p_status TEXT DEFAULT 'draft',
  p_question_id UUID DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_topic TEXT DEFAULT NULL,
  p_exam_type TEXT DEFAULT NULL,
  p_exam_name TEXT DEFAULT NULL,
  p_exam_year INT DEFAULT NULL,
  p_source_type TEXT DEFAULT 'curriculum',
  p_source_reference TEXT DEFAULT NULL,
  p_language TEXT DEFAULT 'en',
  p_verification_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_question_id UUID;
  v_existing_question RECORD;
  v_category RECORD;
  v_opt RECORD;
  v_opt_count INT := 0;
  v_has_a BOOLEAN := false;
  v_has_b BOOLEAN := false;
  v_has_c BOOLEAN := false;
  v_has_d BOOLEAN := false;
  v_opt_key TEXT;
  v_opt_text TEXT;
BEGIN
  -- Security check: Require authenticated admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  -- 1. Parameter Validation
  IF p_question_text IS NULL OR length(trim(p_question_text)) < 10 THEN
    RAISE EXCEPTION 'Question text must be at least 10 characters long';
  END IF;

  IF p_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RAISE EXCEPTION 'Invalid difficulty: %. Must be easy, medium, or hard', p_difficulty;
  END IF;

  IF p_marks IS NULL OR p_marks < 1 THEN
    RAISE EXCEPTION 'Marks must be an integer greater than or equal to 1';
  END IF;

  IF p_correct_option_id NOT IN ('A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'Invalid correct_option_id: %. Must be A, B, C, or D', p_correct_option_id;
  END IF;

  IF p_status NOT IN ('draft', 'under_review', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be draft, under_review, published, or archived', p_status;
  END IF;

  IF p_source_type NOT IN ('official_exam', 'textbook', 'curriculum', 'ai_assisted', 'original') THEN
    RAISE EXCEPTION 'Invalid source_type: %', p_source_type;
  END IF;

  IF p_explanation IS NULL OR length(trim(p_explanation)) = 0 THEN
    IF p_status = 'published' THEN
      RAISE EXCEPTION 'Explanation is required when publishing a question';
    END IF;
  END IF;

  -- 2. Category Validation
  SELECT id, is_active INTO v_category
  FROM public.categories
  WHERE id = p_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found: %', p_category_id;
  END IF;

  IF p_question_id IS NULL THEN
    -- On INSERT: category MUST be active
    IF v_category.is_active <> true THEN
      RAISE EXCEPTION 'Cannot assign new question to an inactive category: %', p_category_id;
    END IF;
  ELSE
    -- On UPDATE: verify question exists
    SELECT * INTO v_existing_question
    FROM public.questions
    WHERE id = p_question_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Question to update not found: %', p_question_id;
    END IF;

    -- If category_id changed, new category must be active
    IF v_existing_question.category_id <> p_category_id AND v_category.is_active <> true THEN
      RAISE EXCEPTION 'Cannot reassign question to an inactive category: %', p_category_id;
    END IF;
  END IF;

  -- 3. Options Validation (Exactly 4 options A/B/C/D with non-empty text)
  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array' THEN
    RAISE EXCEPTION 'Options must be a JSON array of 4 objects';
  END IF;

  IF jsonb_array_length(p_options) <> 4 THEN
    RAISE EXCEPTION 'Exactly 4 options (A, B, C, D) are required, but % supplied', jsonb_array_length(p_options);
  END IF;

  FOR v_opt IN SELECT * FROM jsonb_to_recordset(p_options) AS x(option_key TEXT, option_text TEXT)
  LOOP
    v_opt_key := trim(v_opt.option_key);
    v_opt_text := trim(v_opt.option_text);

    IF v_opt_key IS NULL OR v_opt_key NOT IN ('A', 'B', 'C', 'D') THEN
      RAISE EXCEPTION 'Invalid option key: %. Must be A, B, C, or D', v_opt.option_key;
    END IF;

    IF v_opt_text IS NULL OR length(v_opt_text) = 0 THEN
      RAISE EXCEPTION 'Option text for key % cannot be empty', v_opt_key;
    END IF;

    IF v_opt_key = 'A' THEN
      IF v_has_a THEN RAISE EXCEPTION 'Duplicate option key: A'; END IF;
      v_has_a := true;
    ELSIF v_opt_key = 'B' THEN
      IF v_has_b THEN RAISE EXCEPTION 'Duplicate option key: B'; END IF;
      v_has_b := true;
    ELSIF v_opt_key = 'C' THEN
      IF v_has_c THEN RAISE EXCEPTION 'Duplicate option key: C'; END IF;
      v_has_c := true;
    ELSIF v_opt_key = 'D' THEN
      IF v_has_d THEN RAISE EXCEPTION 'Duplicate option key: D'; END IF;
      v_has_d := true;
    END IF;

    v_opt_count := v_opt_count + 1;
  END LOOP;

  IF NOT (v_has_a AND v_has_b AND v_has_c AND v_has_d) THEN
    RAISE EXCEPTION 'All four options (A, B, C, D) must be present';
  END IF;

  -- 4. Atomic Upsert of Question & Options
  IF p_question_id IS NULL THEN
    -- INSERT: trg_questions_lifecycle derives created_by, computes content_hash, sets updated_at
    INSERT INTO public.questions (
      category_id,
      question_text,
      difficulty,
      marks,
      correct_option_id,
      explanation,
      status,
      subject,
      topic,
      exam_type,
      exam_name,
      exam_year,
      source_type,
      source_reference,
      language,
      verification_notes
    ) VALUES (
      p_category_id,
      trim(p_question_text),
      p_difficulty,
      p_marks,
      p_correct_option_id,
      trim(p_explanation),
      p_status,
      trim(p_subject),
      trim(p_topic),
      trim(p_exam_type),
      trim(p_exam_name),
      p_exam_year,
      p_source_type,
      trim(p_source_reference),
      COALESCE(trim(p_language), 'en'),
      trim(p_verification_notes)
    )
    RETURNING id INTO v_question_id;

    -- Insert 4 options
    INSERT INTO public.options (question_id, option_key, option_text)
    SELECT
      v_question_id,
      trim(opt->>'option_key'),
      trim(opt->>'option_text')
    FROM jsonb_array_elements(p_options) AS opt;

  ELSE
    -- UPDATE: trg_questions_lifecycle enforces demotion block if linked to any published test
    v_question_id := p_question_id;

    UPDATE public.questions
    SET
      category_id = p_category_id,
      question_text = trim(p_question_text),
      difficulty = p_difficulty,
      marks = p_marks,
      correct_option_id = p_correct_option_id,
      explanation = trim(p_explanation),
      status = p_status,
      subject = trim(p_subject),
      topic = trim(p_topic),
      exam_type = trim(p_exam_type),
      exam_name = trim(p_exam_name),
      exam_year = p_exam_year,
      source_type = p_source_type,
      source_reference = trim(p_source_reference),
      language = COALESCE(trim(p_language), 'en'),
      verification_notes = trim(p_verification_notes)
    WHERE id = v_question_id;

    -- Upsert 4 options in-place by unique (question_id, option_key) constraint
    INSERT INTO public.options (question_id, option_key, option_text)
    SELECT
      v_question_id,
      trim(opt->>'option_key'),
      trim(opt->>'option_text')
    FROM jsonb_array_elements(p_options) AS opt
    ON CONFLICT (question_id, option_key)
    DO UPDATE SET option_text = EXCLUDED.option_text;

  END IF;

  -- Return complete updated item
  RETURN public.admin_get_question_bank_item(v_question_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 4. RPC: Archive Question Bank Item
CREATE OR REPLACE FUNCTION public.admin_archive_question(
  p_question_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_question RECORD;
  v_published_test_title TEXT;
BEGIN
  -- Security check: Require authenticated admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  -- Verify question exists
  SELECT * INTO v_question
  FROM public.questions
  WHERE id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found: %', p_question_id;
  END IF;

  -- Block if linked to ANY published test (in test_questions or legacy test_id)
  SELECT t.title INTO v_published_test_title
  FROM public.test_questions tq
  JOIN public.tests t ON t.id = tq.test_id
  WHERE tq.question_id = p_question_id
    AND t.is_published = true
  LIMIT 1;

  IF v_published_test_title IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot archive question: it is currently linked to published test "%". Unlink the question from published tests first.', v_published_test_title;
  END IF;

  IF v_question.test_id IS NOT NULL THEN
    SELECT title INTO v_published_test_title
    FROM public.tests
    WHERE id = v_question.test_id AND is_published = true;

    IF v_published_test_title IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot archive question: it is currently linked to published test "%" via legacy reference. Unlink the question from published tests first.', v_published_test_title;
    END IF;
  END IF;

  -- Transition to archived (trigger trg_questions_lifecycle executes and clears verified_by)
  UPDATE public.questions
  SET status = 'archived'
  WHERE id = p_question_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_question_id,
    'status', 'archived',
    'message', 'Question archived successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 5. RPC: Permanently Delete Question Bank Item (Strictly Guarded)
CREATE OR REPLACE FUNCTION public.admin_delete_question(
  p_question_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_question RECORD;
  v_test_title TEXT;
  v_has_submissions BOOLEAN;
BEGIN
  -- Security check: Require authenticated admin
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required';
  END IF;

  -- Verify question exists
  SELECT * INTO v_question
  FROM public.questions
  WHERE id = p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found: %', p_question_id;
  END IF;

  -- Block if status is published
  IF v_question.status = 'published' THEN
    RAISE EXCEPTION 'Cannot delete a published question. Archive it instead if it is unlinked from active tests.';
  END IF;

  -- Block if linked to ANY test (published or draft)
  SELECT t.title INTO v_test_title
  FROM public.test_questions tq
  JOIN public.tests t ON t.id = tq.test_id
  WHERE tq.question_id = p_question_id
  LIMIT 1;

  IF v_test_title IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete question: it is linked to test "%". Remove all test associations before deleting.', v_test_title;
  END IF;

  IF v_question.test_id IS NOT NULL THEN
    SELECT title INTO v_test_title
    FROM public.tests
    WHERE id = v_question.test_id;

    IF v_test_title IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot delete question: it is linked to test "%" via legacy test_id. Remove test association before deleting.', v_test_title;
    END IF;
  END IF;

  -- Block if referenced by historical student submissions
  SELECT EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.answers ? p_question_id::text
       OR s.question_results @> jsonb_build_array(
            jsonb_build_object('questionId', p_question_id::text)
          )
  ) INTO v_has_submissions;

  IF v_has_submissions THEN
    RAISE EXCEPTION 'Cannot delete question: historical student submissions exist for this question. Archive it instead to preserve scorecard integrity.';
  END IF;

  -- Execute permanent delete (cascades to options via FK)
  DELETE FROM public.questions
  WHERE id = p_question_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_question_id,
    'action', 'deleted',
    'message', 'Question and associated options permanently deleted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 6. Function Execution Grants (Least-Privilege Role Model)
REVOKE ALL ON FUNCTION public.admin_get_question_bank FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_question_bank TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_question_bank_item(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_question_bank_item(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_save_question FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_question TO authenticated;

REVOKE ALL ON FUNCTION public.admin_archive_question(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_question(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_question(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(UUID) TO authenticated;
