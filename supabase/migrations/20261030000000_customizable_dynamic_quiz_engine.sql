-- ==============================================================================
-- Migration: Customizable Dynamic Quiz Engine & Real-Time Question Randomizer
-- Enables:
-- 1. get_custom_test_for_student (Custom question count, test vs category pool, shuffling)
-- 2. submit_quiz_answers (Enhanced to evaluate custom question subsets and custom durations)
-- ==============================================================================

-- 1. Create get_custom_test_for_student
CREATE OR REPLACE FUNCTION public.get_custom_test_for_student(
  p_slug_or_id TEXT,
  p_question_count INT DEFAULT NULL,
  p_pool_scope TEXT DEFAULT 'test',
  p_shuffle_questions BOOLEAN DEFAULT true,
  p_shuffle_options BOOLEAN DEFAULT true
)
RETURNS JSONB AS $func$
DECLARE
  v_test RECORD;
  v_questions JSONB := '[]'::jsonb;
  v_has_test_questions BOOLEAN;
  v_effective_count INT;
BEGIN
  -- 1. Locate the published test by slug or UUID
  SELECT t.*, c.name AS category_name
  INTO v_test
  FROM public.tests t
  JOIN public.categories c ON c.id = t.category_id
  WHERE (t.slug = p_slug_or_id OR t.id::text = p_slug_or_id)
  AND (t.is_published = true OR public.is_admin());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_effective_count := COALESCE(p_question_count, 100);

  -- 2. Determine questions pool based on p_pool_scope ('category' vs 'test')
  IF p_pool_scope = 'category' THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', q_sub.id,
          'test_id', v_test.id,
          'question_number', q_sub.row_num,
          'text', q_sub.question_text,
          'difficulty', q_sub.difficulty,
          'marks', q_sub.marks,
          'options', q_sub.options
        ) ORDER BY q_sub.row_num
      ),
      '[]'::jsonb
    ) INTO v_questions
    FROM (
      SELECT
        q.id,
        q.question_text,
        q.difficulty,
        COALESCE(q.marks, 1) AS marks,
        row_number() OVER () AS row_num,
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', o.option_key,
                'option_key', o.option_key,
                'text', o.option_text
              )
              ORDER BY CASE WHEN p_shuffle_options THEN random() ELSE 0 END, o.option_key
            ),
            '[]'::jsonb
          )
          FROM public.options o WHERE o.question_id = q.id
        ) AS options
      FROM public.questions q
      WHERE q.category_id = v_test.category_id
      AND (q.status = 'published' OR public.is_admin())
      ORDER BY CASE WHEN p_shuffle_questions THEN random() ELSE 0 END
      LIMIT v_effective_count
    ) q_sub;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.test_questions WHERE test_id = v_test.id
    ) INTO v_has_test_questions;

    IF v_has_test_questions THEN
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', q_sub.id,
            'test_id', v_test.id,
            'question_number', q_sub.row_num,
            'text', q_sub.question_text,
            'difficulty', q_sub.difficulty,
            'marks', q_sub.marks,
            'options', q_sub.options
          ) ORDER BY q_sub.row_num
        ),
        '[]'::jsonb
      ) INTO v_questions
      FROM (
        SELECT
          q.id,
          q.question_text,
          q.difficulty,
          COALESCE(tq.marks, q.marks, 1) AS marks,
          row_number() OVER () AS row_num,
          (
            SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', o.option_key,
                  'option_key', o.option_key,
                  'text', o.option_text
                )
                ORDER BY CASE WHEN p_shuffle_options THEN random() ELSE 0 END, o.option_key
              ),
              '[]'::jsonb
            )
            FROM public.options o WHERE o.question_id = q.id
          ) AS options
        FROM public.test_questions tq
        JOIN public.questions q ON q.id = tq.question_id
        WHERE tq.test_id = v_test.id
        AND (q.status = 'published' OR public.is_admin())
        ORDER BY CASE WHEN p_shuffle_questions THEN random() ELSE tq.question_number END
        LIMIT v_effective_count
      ) q_sub;
    ELSE
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', q_sub.id,
            'test_id', v_test.id,
            'question_number', q_sub.row_num,
            'text', q_sub.question_text,
            'difficulty', q_sub.difficulty,
            'marks', q_sub.marks,
            'options', q_sub.options
          ) ORDER BY q_sub.row_num
        ),
        '[]'::jsonb
      ) INTO v_questions
      FROM (
        SELECT
          q.id,
          q.question_text,
          q.difficulty,
          COALESCE(q.marks, 1) AS marks,
          row_number() OVER () AS row_num,
          (
            SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', o.option_key,
                  'option_key', o.option_key,
                  'text', o.option_text
                )
                ORDER BY CASE WHEN p_shuffle_options THEN random() ELSE 0 END, o.option_key
              ),
              '[]'::jsonb
            )
            FROM public.options o WHERE o.question_id = q.id
          ) AS options
        FROM public.questions q
        WHERE q.test_id = v_test.id
        AND (q.status = 'published' OR public.is_admin())
        ORDER BY CASE WHEN p_shuffle_questions THEN random() ELSE q.question_number END
        LIMIT v_effective_count
      ) q_sub;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_test.id,
    'category_id', v_test.category_id,
    'category_name', v_test.category_name,
    'title', v_test.title,
    'slug', v_test.slug,
    'description', v_test.description,
    'duration_minutes', v_test.duration_minutes,
    'difficulty', v_test.difficulty,
    'total_marks', jsonb_array_length(COALESCE(v_questions, '[]'::jsonb)),
    'is_published', v_test.is_published,
    'rating', v_test.rating,
    'total_attempts', v_test.total_attempts,
    'created_at', v_test.created_at,
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_custom_test_for_student(TEXT, INT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_custom_test_for_student(TEXT, INT, TEXT, BOOLEAN, BOOLEAN) TO anon, authenticated;

-- 2. Enhanced submit_quiz_answers that supports custom question subsets and custom durations
CREATE OR REPLACE FUNCTION public.submit_quiz_answers(
  p_test_id UUID,
  p_answers JSONB,
  p_time_taken_seconds INT,
  p_question_ids UUID[] DEFAULT NULL,
  p_custom_duration_minutes INT DEFAULT NULL
)
RETURNS JSONB AS $func$
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
  v_time_allocated_seconds := COALESCE(p_custom_duration_minutes * 60, v_test.duration_minutes * 60);

  -- Check if test uses test_questions junction
  SELECT EXISTS (
    SELECT 1 FROM public.test_questions WHERE test_id = p_test_id
  ) INTO v_has_test_questions;

  -- Grade questions: If p_question_ids is given, grade exactly those questions
  FOR v_question IN
    SELECT
      q.id,
      q.correct_option_id,
      q.explanation,
      q.question_text,
      row_number() OVER () AS question_number,
      COALESCE(q.marks, 1) AS marks,
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
    WHERE (
      (p_question_ids IS NOT NULL AND q.id = ANY(p_question_ids))
      OR (p_question_ids IS NULL AND (
        (v_has_test_questions AND q.id IN (SELECT question_id FROM public.test_questions WHERE test_id = p_test_id))
        OR (NOT v_has_test_questions AND q.test_id = p_test_id)
      ))
    )
    AND (q.status = 'published' OR public.is_admin())
    GROUP BY q.id, q.correct_option_id, q.explanation, q.question_text, q.marks
    ORDER BY (
      CASE WHEN p_question_ids IS NOT NULL THEN array_position(p_question_ids, q.id) ELSE 0 END
    ), q.id
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
      'questionNumber', v_total_questions,
      'text', v_question.question_text,
      'userAnswer', v_user_answer,
      'correctOptionId', v_question.correct_option_id,
      'isCorrect', v_is_correct,
      'isAttempted', v_is_attempted,
      'explanation', v_question.explanation,
      'options', v_question.options_list
    );
  END LOOP;

  v_unattempted_count := v_total_questions - v_attempted_count;

  IF v_max_score > 0 THEN
    v_percentage := round((v_score::numeric / v_max_score::numeric) * 100);
  ELSE
    v_percentage := 0;
  END IF;

  v_submission_id := gen_random_uuid();

  -- Save to submissions table
  INSERT INTO public.submissions (
    id,
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
    v_submission_id,
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
    p_time_taken_seconds,
    p_answers,
    v_question_results,
    now()
  );

  -- Increment attempts on test
  UPDATE public.tests
  SET total_attempts = total_attempts + 1
  WHERE id = p_test_id;

  RETURN jsonb_build_object(
    'submissionId', v_submission_id,
    'testId', p_test_id,
    'testTitle', v_test.title,
    'categoryName', v_category_name,
    'score', v_score,
    'totalMarks', v_max_score,
    'percentage', v_percentage,
    'timeSpentSeconds', p_time_taken_seconds,
    'timeAllocatedSeconds', v_time_allocated_seconds,
    'totalQuestions', v_total_questions,
    'attemptedCount', v_attempted_count,
    'correctCount', v_correct_count,
    'wrongCount', v_wrong_count,
    'unattemptedCount', v_unattempted_count,
    'questionResults', v_question_results,
    'submittedAt', now()
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.submit_quiz_answers(UUID, JSONB, INT, UUID[], INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_answers(UUID, JSONB, INT, UUID[], INT) TO anon, authenticated;
