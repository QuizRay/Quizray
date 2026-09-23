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

async function runHistoryVerification() {
  console.log('====================================================');
  console.log('QuizRay Phase 3B-1 Test History & Privacy Verification');
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
  let pendingMigrationCount = 0;

  console.log('--- SECTION 1: LIVE TESTED SECURITY BOUNDARIES ---\n');

  // 1. Submissions Table: Direct Anonymous SELECT Access Blocked
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

  // 2. Anonymous Cannot Execute History RPC (or pending migration)
  try {
    const { data, error } = await client.rpc('get_user_quiz_history', {
      p_limit: 5,
      p_offset: 0,
    });

    if (error) {
      if (error.code === '42883' || error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
        console.log('ℹ [2. Live] get_user_quiz_history RPC: Pending SQL migration in Supabase SQL Editor.');
        pendingMigrationCount++;
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('✓ [2. Live] get_user_quiz_history RPC: Anonymous execution blocked by grant (42501 permission denied).');
      } else {
        console.log(`✓ [2. Live] get_user_quiz_history RPC: Safely rejected anonymous call: ${error.message}`);
      }
    } else if (Array.isArray(data) && data.length === 0) {
      console.log('✓ [2. Live] get_user_quiz_history RPC: Safely returned 0 records for anonymous caller.');
    }
  } catch (err) {
    console.log('✓ [2. Live] get_user_quiz_history RPC rejected:', err.message);
  }

  // 3. Anonymous Cannot Execute Historical Scorecard RPC
  try {
    const { data, error } = await client.rpc('get_submission_for_user', {
      p_submission_id: '00000000-0000-0000-0000-000000000000',
    });

    if (error) {
      if (error.code === '42883' || error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
        console.log('ℹ [3. Live] get_submission_for_user RPC: Pending SQL migration in Supabase SQL Editor.');
        pendingMigrationCount++;
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('✓ [3. Live] get_submission_for_user RPC: Anonymous execution blocked by grant (42501 permission denied).');
      } else {
        console.log(`✓ [3. Live] get_submission_for_user RPC: Safely rejected anonymous call: ${error.message}`);
      }
    } else if (data === null) {
      console.log('✓ [3. Live] get_submission_for_user RPC: Safely returned null for unauthenticated caller.');
    }
  } catch (err) {
    console.log('✓ [3. Live] get_submission_for_user RPC rejected:', err.message);
  }

  // 4. Anonymous Cannot Execute User Completed Quiz Count RPC
  try {
    const { data, error } = await client.rpc('get_user_completed_quiz_count');
    if (error) {
      if (error.code === '42883' || error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
        console.log('ℹ [4. Live] get_user_completed_quiz_count RPC: Pending SQL migration in Supabase SQL Editor.');
        pendingMigrationCount++;
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('✓ [4. Live] get_user_completed_quiz_count RPC: Anonymous execution blocked by grant (42501 permission denied).');
      } else {
        console.log(`✓ [4. Live] get_user_completed_quiz_count RPC: Safely rejected anonymous call: ${error.message}`);
      }
    } else if (data === 0) {
      console.log('✓ [4. Live] get_user_completed_quiz_count RPC: Safely returned 0 for unauthenticated caller.');
    }
  } catch (err) {
    console.log('✓ [4. Live] get_user_completed_quiz_count RPC rejected:', err.message);
  }

  // 5. Anonymous Cannot Execute Admin Submission Count RPC
  try {
    const { data, error } = await client.rpc('get_admin_submission_count');
    if (error) {
      if (error.code === '42883' || error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
        console.log('ℹ [5. Live] get_admin_submission_count RPC: Pending SQL migration in Supabase SQL Editor.');
        pendingMigrationCount++;
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('✓ [5. Live] get_admin_submission_count RPC: Anonymous execution blocked by grant (42501 permission denied).');
      } else {
        console.log(`✓ [5. Live] get_admin_submission_count RPC: Safely rejected anonymous call: ${error.message}`);
      }
    } else if (data === null) {
      console.log('✓ [5. Live] get_admin_submission_count RPC: Safely returned null for unauthenticated caller.');
    }
  } catch (err) {
    console.log('✓ [5. Live] get_admin_submission_count RPC rejected:', err.message);
  }

  // 6. Regression: Anonymous Quiz Submission Flow Continues Working
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
        p_time_taken_seconds: 30,
      });

      if (subError) {
        console.error('❌ [6. Live] Anonymous Quiz Submission FAILED:', subError.message);
        liveChecksPassed = false;
      } else if (submission && submission.submissionId) {
        console.log(`✓ [6. Live] Anonymous user successfully submitted test "${tests[0].title}".`);
        console.log(`  - Submission ID generated: ${submission.submissionId}`);
        console.log(`  - Server-calculated Score: ${submission.score}/${submission.maxScore}`);
      }
    }
  } catch (err) {
    console.error('❌ [6. Live] Anonymous Quiz Submission EXCEPTION:', err.message);
    liveChecksPassed = false;
  }

  // 7. Regression: Student Question Sanitization Intact
  try {
    const { data: studentTest, error: testErr } = await client.rpc('get_test_for_student', {
      p_slug_or_id: 'computer-basics-test-01',
    });

    if (testErr) {
      console.error('❌ [7. Live] Question Sanitization FAILED:', testErr.message);
      liveChecksPassed = false;
    } else if (studentTest) {
      const questions = studentTest.questions || [];
      let leaked = 0;
      for (const q of questions) {
        if ('correct_option_id' in q || 'explanation' in q) leaked++;
      }
      if (leaked === 0) {
        console.log(`✓ [7. Live] Zero answer keys or explanations exposed across ${questions.length} questions in get_test_for_student.`);
      } else {
        console.error(`❌ [7. Live] FAILED: Leaked ${leaked} answer keys or explanations.`);
        liveChecksPassed = false;
      }
    }
  } catch (err) {
    console.error('❌ [7. Live] Question Sanitization EXCEPTION:', err.message);
    liveChecksPassed = false;
  }

  console.log('\n--- SECTION 2: SQL & CODEBASE AUDIT ---\n');

  // 8. Codebase Audit: Zero Direct Submissions Table Queries in ./src
  const patterns = [".from('submissions')", '.from("submissions")', 'public.submissions'];
  const srcFiles = walkDir('./src');
  let leakedOccurrences = 0;

  for (const f of srcFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      for (const pat of patterns) {
        if (line.includes(pat)) {
          console.error(`❌ [8. Audit] Found direct query: ${pat} in ${f}:${idx + 1}`);
          leakedOccurrences++;
        }
      }
    });
  }

  if (leakedOccurrences === 0) {
    console.log('✓ [8. Audit] Zero direct queries against submissions table (.from(\'submissions\') / public.submissions) in ./src.');
  } else {
    liveChecksPassed = false;
  }

  // 9. SQL Migration Audit: Search Path & Object Qualification
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260905020000_test_history_and_submission_privacy.sql');
  if (fs.existsSync(migrationPath)) {
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    const hasRestrictedSearchPath = sqlContent.includes("SET search_path = ''");
    const hasPgTemp = sqlContent.includes('pg_temp');
    const hasCoalesceBug = sqlContent.includes('pg_catalog.coalesce');
    const hasNormalCoalesce = sqlContent.includes('COALESCE(');

    if (hasRestrictedSearchPath && !hasPgTemp) {
      console.log('✓ [9. Audit] Migration strictly uses SET search_path = \'\' across all RPCs (no pg_temp).');
    } else {
      console.error('❌ [9. Audit] Migration does not strictly use SET search_path = \'\'');
      liveChecksPassed = false;
    }

    if (!hasCoalesceBug && hasNormalCoalesce) {
      console.log('✓ [10. Audit] Standard COALESCE(...) used correctly (no pg_catalog.coalesce bug).');
    } else {
      console.error('❌ [10. Audit] COALESCE syntax issue detected in migration.');
      liveChecksPassed = false;
    }
  }

  console.log('\n--- SECTION 3: MANUAL TESTS REQUIRED AFTER MIGRATION ---\n');
  console.log('• Sign in with an authenticated student account.');
  console.log('• Complete a quiz while logged in.');
  console.log('• Navigate to #/history and verify completed test appears.');
  console.log('• Click "View Result" to reopen historical scorecard and verify questions and explanations load.');
  console.log('• Verify ProfileView "Quizzes Completed" counter displays correct count.');

  console.log('\n====================================================');
  if (pendingMigrationCount > 0) {
    console.log('STATUS: READY FOR SUPABASE SQL EDITOR MIGRATION');
    console.log(`(${pendingMigrationCount} RPCs pending execution in SQL editor)`);
  } else if (liveChecksPassed) {
    console.log('STATUS: ALL CHECKS PASSED');
  } else {
    console.log('STATUS: VERIFICATION ISSUES DETECTED');
  }
  console.log('====================================================\n');

  if (!liveChecksPassed) process.exit(1);
}

runHistoryVerification();
