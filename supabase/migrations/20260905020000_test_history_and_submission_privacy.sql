-- ==============================================================================
-- QuizRay Database Migration: Phase 3B-1
-- Test History & Submission Privacy Hardening (Zero Direct SELECT Model)
-- ==============================================================================

-- 1. Complete Revocation of Direct Table Permissions on submissions
-- Submissions contain sensitive answer keys, explanations, and student answers.
-- All student and admin read paths are routed through strictly scoped SECURITY DEFINER RPCs.
REVOKE SELECT ON public.submissions FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.submissions FROM anon, authenticated, PUBLIC;

-- 2. Clean Up Submissions RLS Policies
-- Drop the initial schema read policy containing the anonymous vulnerability (user_id IS NULL)
DROP POLICY IF EXISTS "Users can read own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated users can read own submissions" ON public.submissions;

-- Maintain admin-only management policy for direct administrative table access if ever needed via service role
DROP POLICY IF EXISTS "Admins can manage submissions" ON public.submissions;
CREATE POLICY "Admins can manage submissions"
  ON public.submissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Optimization Index for User Test History
CREATE INDEX IF NOT EXISTS idx_submissions_user_submitted_at
  ON public.submissions(user_id, submitted_at DESC);

-- 4. Secure RPC: get_user_quiz_history
-- Returns paginated quiz attempt summary records for the authenticated user only
CREATE OR REPLACE FUNCTION public.get_user_quiz_history(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_user_id UUID;
  v_history jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'testId', s.test_id,
        'testTitle', t.title,
        'categoryName', COALESCE(c.name, 'General'),
        'score', s.score,
        'maxScore', s.max_score,
        'percentage', s.percentage,
        'totalQuestions', s.total_questions,
        'attemptedCount', s.attempted_count,
        'correctCount', s.correct_count,
        'wrongCount', s.wrong_count,
        'timeTakenSeconds', s.time_taken_seconds,
        'submittedAt', s.submitted_at
      ) ORDER BY s.submitted_at DESC
    ),
    '[]'::jsonb
  ) INTO v_history
  FROM (
    SELECT * FROM public.submissions
    WHERE user_id = v_user_id
    ORDER BY submitted_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0)
  ) s
  JOIN public.tests t ON t.id = s.test_id
  LEFT JOIN public.categories c ON c.id = t.category_id;

  RETURN v_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Secure RPC: get_submission_for_user
-- Reopens the full historical scorecard ONLY for the authenticated owner or an admin
CREATE OR REPLACE FUNCTION public.get_submission_for_user(p_submission_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_user_id UUID;
  v_sub RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    s.*,
    t.title AS test_title,
    COALESCE(c.name, 'General') AS category_name
  INTO v_sub
  FROM public.submissions s
  JOIN public.tests t ON t.id = s.test_id
  LEFT JOIN public.categories c ON c.id = t.category_id
  WHERE s.id = p_submission_id
  AND (s.user_id = v_user_id OR public.is_admin());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'submissionId', v_sub.id,
    'testId', v_sub.test_id,
    'testTitle', v_sub.test_title,
    'categoryName', v_sub.category_name,
    'totalQuestions', v_sub.total_questions,
    'attemptedCount', v_sub.attempted_count,
    'unattemptedCount', v_sub.unattempted_count,
    'correctCount', v_sub.correct_count,
    'wrongCount', v_sub.wrong_count,
    'score', v_sub.score,
    'maxScore', v_sub.max_score,
    'percentage', v_sub.percentage,
    'timeAllocatedSeconds', v_sub.time_allocated_seconds,
    'timeTakenSeconds', v_sub.time_taken_seconds,
    'submittedAt', v_sub.submitted_at,
    'answers', v_sub.answers,
    'questionResults', v_sub.question_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 6. Secure RPC: get_user_completed_quiz_count
-- Returns the completed quiz count for the authenticated student
CREATE OR REPLACE FUNCTION public.get_user_completed_quiz_count()
RETURNS INT AS $$
DECLARE
  v_user_id UUID;
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM public.submissions
  WHERE user_id = v_user_id;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 7. Secure Admin RPC: get_admin_submission_count
-- Returns total platform submission count strictly for authorized administrators
CREATE OR REPLACE FUNCTION public.get_admin_submission_count()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM public.submissions;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 8. Function Permissions (Strict Least Privilege)
REVOKE EXECUTE ON FUNCTION public.get_user_quiz_history(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_quiz_history(INT, INT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_submission_for_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_submission_for_user(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_completed_quiz_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_completed_quiz_count() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_submission_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_submission_count() TO authenticated;
