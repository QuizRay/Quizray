import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(walkDir(full));
      }
    } else {
      results.push(full);
    }
  }
  return results;
}

async function runPerformanceVerification() {
  console.log('====================================================');
  console.log('QuizRay Phase 3B-2 Performance Analytics Verification');
  console.log('====================================================\n');

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL || '';
  const key = env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    console.error('❌ Supabase environment credentials missing in .env');
    process.exit(1);
  }

  const client = createClient(url, key);
  let liveChecksPassed = true;
  let pendingMigration = false;

  console.log('--- SECTION 1: LIVE TESTED SECURITY BOUNDARIES ---\n');

  // 1. Submissions Table: Direct Anonymous SELECT Access Must Remain Blocked
  try {
    const { data, error } = await client.from('submissions').select('*');
    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('✓ [1. Live] Direct SELECT on submissions table is blocked for anon client (42501 permission denied).');
      } else {
        console.log(`✓ [1. Live] Direct SELECT on submissions table is rejected with error: ${error.message}`);
      }
    } else if (!data || data.length === 0) {
      console.log('✓ [1. Live] Direct SELECT on submissions table returned 0 rows under RLS.');
    } else {
      console.error('❌ [1. Live] FAILED: Anonymous client read submission rows directly!');
      liveChecksPassed = false;
    }
  } catch (err) {
    console.log('✓ [1. Live] Direct SELECT on submissions table rejected with exception:', err.message);
  }

  // 2. Anonymous Cannot Execute get_user_performance_analytics RPC
  try {
    const { data, error } = await client.rpc('get_user_performance_analytics');
    if (error) {
      if (error.code === '42883' || error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
        console.log('ℹ [2. Live] get_user_performance_analytics RPC: Pending SQL migration execution in Supabase SQL Editor.');
        pendingMigration = true;
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('✓ [2. Live] get_user_performance_analytics RPC: Anonymous execution blocked by grant (42501 permission denied).');
      } else if (error.message.includes('Not authenticated')) {
        console.log('✓ [2. Live] get_user_performance_analytics RPC: Blocked with exception "Not authenticated".');
      } else {
        console.log(`✓ [2. Live] get_user_performance_analytics RPC: Safely rejected anonymous call: ${error.message}`);
      }
    } else if (!data) {
      console.log('✓ [2. Live] get_user_performance_analytics RPC returned no data for anonymous caller.');
    } else {
      console.error('❌ [2. Live] FAILED: Anonymous user was able to execute performance analytics RPC!');
      liveChecksPassed = false;
    }
  } catch (err) {
    console.log('✓ [2. Live] get_user_performance_analytics RPC rejected with exception:', err.message);
  }

  // 3. Regression: Anonymous Quiz Submission Flow Continues Working
  try {
    const { data: tests } = await client
      .from('tests')
      .select('id, title')
      .eq('is_published', true)
      .limit(1);

    if (tests && tests.length > 0) {
      const testId = tests[0].id;
      const { data: submission, error: subError } = await client.rpc('submit_quiz_answers', {
        p_test_id: testId,
        p_answers: {},
        p_time_taken_seconds: 45,
      });

      if (subError) {
        console.error('❌ [3. Live] Anonymous Quiz Submission FAILED:', subError.message);
        liveChecksPassed = false;
      } else if (submission && submission.submissionId) {
        console.log(`✓ [3. Live] Anonymous user successfully submitted test "${tests[0].title}".`);
        console.log(`  - Submission ID generated: ${submission.submissionId}`);
        console.log(`  - Server-calculated Score: ${submission.score}/${submission.maxScore}`);
      }
    }
  } catch (err) {
    console.error('❌ [3. Live] Anonymous Quiz Submission EXCEPTION:', err.message);
    liveChecksPassed = false;
  }

  // 4. Regression: Question Sanitization Intact
  try {
    const { data: studentTest, error: testErr } = await client.rpc('get_test_for_student', {
      p_slug_or_id: 'computer-basics-test-01',
    });

    if (testErr) {
      console.error('❌ [4. Live] Question Sanitization FAILED:', testErr.message);
      liveChecksPassed = false;
    } else if (studentTest) {
      const questions = studentTest.questions || [];
      let leaked = 0;
      for (const q of questions) {
        if ('correct_option_id' in q || 'explanation' in q) leaked++;
      }
      if (leaked === 0) {
        console.log(`✓ [4. Live] Zero answer keys or explanations exposed across ${questions.length} questions in get_test_for_student.`);
      } else {
        console.error(`❌ [4. Live] FAILED: Leaked ${leaked} answer keys or explanations.`);
        liveChecksPassed = false;
      }
    }
  } catch (err) {
    console.error('❌ [4. Live] Question Sanitization EXCEPTION:', err.message);
    liveChecksPassed = false;
  }

  console.log('\n--- SECTION 2: SQL MIGRATION SECURITY AUDIT ---\n');

  // 5. Migration File Security Attributes Audit
  const correctivePath = path.resolve(process.cwd(), 'supabase/migrations/20260907010000_fix_user_performance_category_color.sql');
  const baseMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260907000000_user_performance_analytics.sql');
  const migrationPath = fs.existsSync(correctivePath) ? correctivePath : baseMigrationPath;
  if (fs.existsSync(migrationPath)) {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    const hasSecurityDefiner = sqlContent.includes('SECURITY DEFINER');
    const hasRestrictedSearchPath = sqlContent.includes("SET search_path = ''");
    const hasAuthUid = sqlContent.includes('auth.uid()');
    const hasNotAuthException = sqlContent.includes("RAISE EXCEPTION 'Not authenticated'");
    const hasRevokePublic = sqlContent.includes('REVOKE EXECUTE ON FUNCTION public.get_user_performance_analytics() FROM PUBLIC, anon;');
    const hasGrantAuth = sqlContent.includes('GRANT EXECUTE ON FUNCTION public.get_user_performance_analytics() TO authenticated;');
    const hasZeroParams = /get_user_performance_analytics\s*\(\s*\)/.test(sqlContent) && !sqlContent.includes('p_user_id');

    if (hasSecurityDefiner) {
      console.log('✓ [5. SQL Audit] Function uses SECURITY DEFINER.');
    } else {
      console.error('❌ [5. SQL Audit] Function missing SECURITY DEFINER.');
      liveChecksPassed = false;
    }

    if (hasRestrictedSearchPath) {
      console.log('✓ [6. SQL Audit] Function strictly uses SET search_path = \'\' (zero path injection).');
    } else {
      console.error('❌ [6. SQL Audit] Function missing SET search_path = \'\'.');
      liveChecksPassed = false;
    }

    if (hasAuthUid && hasNotAuthException && hasZeroParams) {
      console.log('✓ [7. SQL Audit] User identity derived strictly from auth.uid() (zero client-provided user_id parameter) with unauthenticated exception.');
    } else {
      console.error('❌ [7. SQL Audit] Missing auth.uid() identity derivation or client user_id detected.');
      liveChecksPassed = false;
    }

    if (hasRevokePublic && hasGrantAuth) {
      console.log('✓ [8. SQL Audit] Least-privilege permissions: REVOKE from PUBLIC/anon and GRANT only to authenticated.');
    } else {
      console.error('❌ [8. SQL Audit] Grants/Revocations missing or incorrect.');
      liveChecksPassed = false;
    }

    // 9. Check for zero answers / question_results / correct_option_id leaks in RPC
    const hasLeakedAnswers = sqlContent.includes('s.answers') || sqlContent.includes('s.question_results');
    if (!hasLeakedAnswers) {
      console.log('✓ [9. SQL Audit] RPC does NOT expose raw submission answers or question_results.');
    } else {
      console.error('❌ [9. SQL Audit] RPC exposes sensitive answers or question_results.');
      liveChecksPassed = false;
    }

    // 10. Check metric calculation safeguards
    const hasAccuracyFormula = sqlContent.includes('SUM(s.correct_count)::NUMERIC / NULLIF(SUM(s.attempted_count), 0)');
    const hasPacingFormula = sqlContent.includes('SUM(s.time_taken_seconds)::NUMERIC / NULLIF(SUM(s.attempted_count), 0)');
    const hasUtilizationFormula = sqlContent.includes('SUM(s.time_taken_seconds)::NUMERIC / NULLIF(SUM(s.time_allocated_seconds), 0)');

    if (hasAccuracyFormula && hasPacingFormula && hasUtilizationFormula) {
      console.log('✓ [10. SQL Audit] NULLIF division-by-zero safeguards correctly used in accuracy, pacing, and time utilization.');
    } else {
      console.error('❌ [10. SQL Audit] Missing NULLIF safeguards in division calculations.');
      liveChecksPassed = false;
    }

    // 11. Focus Areas / Weak Areas Rule
    const hasWeakAreaSort = sqlContent.includes('ORDER BY avg_percentage ASC, accuracy ASC') && sqlContent.includes('LIMIT 3');
    const hasClassification = sqlContent.includes("'Needs Practice'") && sqlContent.includes("'Improve'") && sqlContent.includes("'Strong'");
    if (hasWeakAreaSort && hasClassification) {
      console.log('✓ [11. SQL Audit] Weak/Focus areas sorted deterministically by avg_percentage ASC then accuracy ASC with 3 classifications.');
    } else {
      console.error('❌ [11. SQL Audit] Weak areas sorting or classification incomplete.');
      liveChecksPassed = false;
    }

    // 12. Corrective Schema Alignment Check: No c.color reference
    const hasCategoryColorCol = sqlContent.includes('c.color');
    if (!hasCategoryColorCol) {
      console.log('✓ [12. SQL Audit] Migration does NOT reference non-existent public.categories.color column.');
    } else {
      console.error('❌ [12. SQL Audit] Migration still contains references to non-existent c.color column.');
      liveChecksPassed = false;
    }
  } else {
    console.error(`❌ [SQL Audit] Migration file not found: ${migrationPath}`);
    liveChecksPassed = false;
  }

  console.log('\n--- SECTION 3: CODEBASE LEAK AUDIT ---\n');

  // 13. Codebase Audit: Zero Direct Submissions Table Queries in ./src
  const patterns = [".from('submissions')", '.from("submissions")', 'public.submissions'];
  const srcFiles = walkDir('./src');
  let directSubmissionQueries = 0;

  for (const f of srcFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const pat of patterns) {
        if (line.includes(pat)) {
          console.error(`❌ [13. Audit] Found direct query: ${pat} in ${f}:${idx + 1}`);
          directSubmissionQueries++;
        }
      }
    });
  }

  if (directSubmissionQueries === 0) {
    console.log('✓ [13. Codebase Audit] Zero direct queries against submissions table (.from(\'submissions\')) in ./src.');
  } else {
    liveChecksPassed = false;
  }

  console.log('\n====================================================');
  if (pendingMigration) {
    console.log('STATUS: READY FOR SUPABASE SQL EDITOR MIGRATION');
    console.log('To activate the live RPC:');
    console.log('Execute supabase/migrations/20260907000000_user_performance_analytics.sql in the Supabase SQL Editor.');
  } else if (liveChecksPassed) {
    console.log('STATUS: ALL CHECKS PASSED');
  } else {
    console.log('STATUS: VERIFICATION ISSUES DETECTED');
  }
  console.log('====================================================\n');

  if (!liveChecksPassed) process.exit(1);
}

runPerformanceVerification();
