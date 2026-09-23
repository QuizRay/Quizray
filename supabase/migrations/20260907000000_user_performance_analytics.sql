-- ==============================================================================
-- QuizRay Database Migration: Phase 3B-2
-- Student Performance / Analytics Aggregated RPC (Zero Direct SELECT Model)
-- ==============================================================================

-- 1. Secure RPC: get_user_performance_analytics
-- Computes and returns authoritative performance metrics, trends, category mastery,
-- difficulty breakdown, focus areas, and pacing efficiency for the authenticated user only.
CREATE OR REPLACE FUNCTION public.get_user_performance_analytics()
RETURNS jsonb AS $$
DECLARE
  v_user_id UUID;
  v_overview jsonb;
  v_score_trend jsonb;
  v_category_performance jsonb;
  v_difficulty_performance jsonb;
  v_weak_areas jsonb;
  v_recent_tests jsonb;
BEGIN
  -- Strict identity derivation from Supabase Auth context
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Overview Metrics
  SELECT jsonb_build_object(
    'total_tests', COUNT(s.id)::INT,
    'avg_score', COALESCE(ROUND(AVG(s.score)::NUMERIC, 1), 0.0),
    'avg_percentage', COALESCE(ROUND(AVG(s.percentage)::NUMERIC, 1), 0.0),
    'overall_accuracy', COALESCE(ROUND((SUM(s.correct_count)::NUMERIC / NULLIF(SUM(s.attempted_count), 0)) * 100, 1), 0.0),
    'total_correct', COALESCE(SUM(s.correct_count)::INT, 0),
    'total_wrong', COALESCE(SUM(s.wrong_count)::INT, 0),
    'total_attempted', COALESCE(SUM(s.attempted_count)::INT, 0),
    'total_questions', COALESCE(SUM(s.total_questions)::INT, 0),
    'best_percentage', COALESCE(MAX(s.percentage)::INT, 0),
    'total_time_taken_seconds', COALESCE(SUM(s.time_taken_seconds)::INT, 0),
    'avg_time_per_test_seconds', COALESCE(ROUND(AVG(s.time_taken_seconds)::NUMERIC, 0)::INT, 0),
    'avg_time_per_question_seconds', COALESCE(ROUND((SUM(s.time_taken_seconds)::NUMERIC / NULLIF(SUM(s.attempted_count), 0)), 1), 0.0),
    'time_utilization_percentage', COALESCE(ROUND((SUM(s.time_taken_seconds)::NUMERIC / NULLIF(SUM(s.time_allocated_seconds), 0)) * 100, 1), 0.0)
  ) INTO v_overview
  FROM public.submissions s
  WHERE s.user_id = v_user_id;

  -- 2. Score Progression Trend (Latest 15 attempts in chronological order)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'submission_id', sub.submission_id,
        'test_id', sub.test_id,
        'test_title', sub.test_title,
        'percentage', sub.percentage,
        'score', sub.score,
        'max_score', sub.max_score,
        'submitted_at', sub.submitted_at
      ) ORDER BY sub.submitted_at ASC
    ),
    '[]'::jsonb
  ) INTO v_score_trend
  FROM (
    SELECT
      s.id AS submission_id,
      s.test_id,
      t.title AS test_title,
      s.percentage,
      s.score,
      s.max_score,
      s.submitted_at
    FROM public.submissions s
    JOIN public.tests t ON t.id = s.test_id
    WHERE s.user_id = v_user_id
    ORDER BY s.submitted_at DESC
    LIMIT 15
  ) sub;

  -- 3. Category Performance
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category_id', cp.category_id,
        'category_name', cp.category_name,
        'category_icon', cp.category_icon,
        'category_color', cp.category_color,
        'tests_taken', cp.tests_taken,
        'avg_percentage', cp.avg_percentage,
        'accuracy', cp.accuracy,
        'total_correct', cp.total_correct,
        'total_attempted', cp.total_attempted,
        'best_percentage', cp.best_percentage
      ) ORDER BY cp.tests_taken DESC, cp.avg_percentage DESC
    ),
    '[]'::jsonb
  ) INTO v_category_performance
  FROM (
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      COALESCE(c.icon, 'BookOpen') AS category_icon,
      COALESCE(c.color, 'blue') AS category_color,
      COUNT(s.id)::INT AS tests_taken,
      COALESCE(ROUND(AVG(s.percentage)::NUMERIC, 1), 0.0) AS avg_percentage,
      COALESCE(ROUND((SUM(s.correct_count)::NUMERIC / NULLIF(SUM(s.attempted_count), 0)) * 100, 1), 0.0) AS accuracy,
      COALESCE(SUM(s.correct_count)::INT, 0) AS total_correct,
      COALESCE(SUM(s.attempted_count)::INT, 0) AS total_attempted,
      COALESCE(MAX(s.percentage)::INT, 0) AS best_percentage
    FROM public.submissions s
    JOIN public.tests t ON t.id = s.test_id
    JOIN public.categories c ON c.id = t.category_id
    WHERE s.user_id = v_user_id
    GROUP BY c.id, c.name, c.icon, c.color
  ) cp;

  -- 4. Difficulty Performance (Test-level difficulty)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'difficulty', dp.difficulty,
        'tests_taken', dp.tests_taken,
        'avg_percentage', dp.avg_percentage,
        'accuracy', dp.accuracy
      ) ORDER BY
        CASE dp.difficulty
          WHEN 'easy' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'hard' THEN 3
          ELSE 4
        END
    ),
    '[]'::jsonb
  ) INTO v_difficulty_performance
  FROM (
    SELECT
      t.difficulty,
      COUNT(s.id)::INT AS tests_taken,
      COALESCE(ROUND(AVG(s.percentage)::NUMERIC, 1), 0.0) AS avg_percentage,
      COALESCE(ROUND((SUM(s.correct_count)::NUMERIC / NULLIF(SUM(s.attempted_count), 0)) * 100, 1), 0.0) AS accuracy
    FROM public.submissions s
    JOIN public.tests t ON t.id = s.test_id
    WHERE s.user_id = v_user_id
    GROUP BY t.difficulty
  ) dp;

  -- 5. Focus Areas / Weak Areas (Lowest performing categories, max 3)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category_id', wa.category_id,
        'category_name', wa.category_name,
        'category_icon', wa.category_icon,
        'category_color', wa.category_color,
        'tests_taken', wa.tests_taken,
        'avg_percentage', wa.avg_percentage,
        'accuracy', wa.accuracy,
        'classification', CASE
          WHEN wa.avg_percentage < 60.0 THEN 'Needs Practice'
          WHEN wa.avg_percentage < 80.0 THEN 'Improve'
          ELSE 'Strong'
        END
      )
    ),
    '[]'::jsonb
  ) INTO v_weak_areas
  FROM (
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      COALESCE(c.icon, 'BookOpen') AS category_icon,
      COALESCE(c.color, 'blue') AS category_color,
      COUNT(s.id)::INT AS tests_taken,
      COALESCE(ROUND(AVG(s.percentage)::NUMERIC, 1), 0.0) AS avg_percentage,
      COALESCE(ROUND((SUM(s.correct_count)::NUMERIC / NULLIF(SUM(s.attempted_count), 0)) * 100, 1), 0.0) AS accuracy
    FROM public.submissions s
    JOIN public.tests t ON t.id = s.test_id
    JOIN public.categories c ON c.id = t.category_id
    WHERE s.user_id = v_user_id
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY avg_percentage ASC, accuracy ASC
    LIMIT 3
  ) wa;

  -- 6. Recent Tests (Latest 5 attempts, newest first)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'submission_id', s.id,
        'test_id', s.test_id,
        'test_title', t.title,
        'category_name', COALESCE(c.name, 'General'),
        'percentage', s.percentage,
        'score', s.score,
        'max_score', s.max_score,
        'submitted_at', s.submitted_at
      ) ORDER BY s.submitted_at DESC
    ),
    '[]'::jsonb
  ) INTO v_recent_tests
  FROM (
    SELECT * FROM public.submissions
    WHERE user_id = v_user_id
    ORDER BY submitted_at DESC
    LIMIT 5
  ) s
  JOIN public.tests t ON t.id = s.test_id
  LEFT JOIN public.categories c ON c.id = t.category_id;

  -- Return consolidated single JSONB payload
  RETURN jsonb_build_object(
    'overview', v_overview,
    'score_trend', v_score_trend,
    'category_performance', v_category_performance,
    'difficulty_performance', v_difficulty_performance,
    'weak_areas', v_weak_areas,
    'recent_tests', v_recent_tests
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Function Permissions (Strict Least Privilege)
REVOKE EXECUTE ON FUNCTION public.get_user_performance_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_performance_analytics() TO authenticated;
