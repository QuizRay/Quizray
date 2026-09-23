import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
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

async function runVerification() {
  console.log('====================================================');
  console.log('QuizRay Live Supabase Integration Verification');
  console.log('====================================================\n');

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  const isConfigured = Boolean(url) && Boolean(key) && !url.includes('your-project') && !key.includes('your-anon-public-key');

  if (!isConfigured) {
    console.log('[STATUS] Supabase environment is NOT configured yet in .env');
    console.log('  Required variables:');
    console.log('  - VITE_SUPABASE_URL');
    console.log('  - VITE_SUPABASE_ANON_KEY');
    console.log('\nPlease populate .env and run this script again.');
    process.exit(2);
  }

  console.log(`Connecting to: ${url}`);
  const client = createClient(url, key);

  let passed = true;

  // 1. Connection & Categories check
  try {
    const { data: categories, error } = await client
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ [Check 1: Categories Query] FAILED:', error.message);
      passed = false;
    } else {
      console.log(`✓ [Check 1: Categories Query] PASSED: Retrieved ${categories.length} active categories.`);
      if (categories.length < 8) {
        console.warn(`  ⚠️ Warning: Expected 8 categories from seed, found ${categories.length}. Seed might not have executed completely.`);
      }
    }
  } catch (err) {
    console.error('❌ [Check 1: Categories Query] EXCEPTION:', err);
    passed = false;
  }

  // 2. Tests check
  let firstTestId = null;
  try {
    const { data: tests, error } = await client
      .from('tests')
      .select('id, title, slug, is_published, category_id')
      .eq('is_published', true);

    if (error) {
      console.error('❌ [Check 2: Tests Query] FAILED:', error.message);
      passed = false;
    } else {
      console.log(`✓ [Check 2: Tests Query] PASSED: Retrieved ${tests.length} published tests.`);
      if (tests.length > 0) {
        firstTestId = tests[0].id;
      }
      if (tests.length < 6) {
        console.warn(`  ⚠️ Warning: Expected 6 tests from seed, found ${tests.length}.`);
      }
    }
  } catch (err) {
    console.error('❌ [Check 2: Tests Query] EXCEPTION:', err);
    passed = false;
  }

  // 3. Security Boundary: Direct Questions Query (RLS)
  try {
    const { data: directQuestions, error } = await client
      .from('questions')
      .select('*');

    if (error || !directQuestions || directQuestions.length === 0) {
      console.log('✓ [Check 3: Direct Questions RLS] PASSED: Direct SELECT on questions table is blocked for anon client.');
    } else {
      console.error('❌ [Check 3: Direct Questions RLS] FAILED: Anonymous client was able to directly read the questions table!');
      passed = false;
    }
  } catch (err) {
    console.log('✓ [Check 3: Direct Questions RLS] PASSED (rejected with exception):', err.message);
  }

  // 4. Secure RPC: get_test_for_student
  let sampleQuestionId = null;
  try {
    const { data: studentTest, error } = await client.rpc('get_test_for_student', {
      p_slug_or_id: firstTestId || 'computer-basics-test-01',
    });

    if (error) {
      console.error('❌ [Check 4: get_test_for_student RPC] FAILED:', error.message);
      passed = false;
    } else if (!studentTest) {
      console.error('❌ [Check 4: get_test_for_student RPC] FAILED: Returned null test.');
      passed = false;
    } else {
      const questions = studentTest.questions || [];
      console.log(`✓ [Check 4: get_test_for_student RPC] PASSED: Retrieved test "${studentTest.title}" with ${questions.length} questions.`);

      let leakedKeys = 0;
      let leakedExplanations = 0;

      for (const q of questions) {
        if ('correct_option_id' in q || 'correctOptionId' in q) leakedKeys++;
        if ('explanation' in q) leakedExplanations++;
      }

      if (leakedKeys === 0 && leakedExplanations === 0) {
        console.log('✓ [Check 4b: Student Question Sanitization] PASSED: Zero correct_option_id and zero explanations exposed.');
        if (questions.length > 0) sampleQuestionId = questions[0].id;
      } else {
        console.error(`❌ [Check 4b: Student Question Sanitization] FAILED: Leaked ${leakedKeys} keys and ${leakedExplanations} explanations!`);
        passed = false;
      }
    }
  } catch (err) {
    console.error('❌ [Check 4: get_test_for_student RPC] EXCEPTION:', err);
    passed = false;
  }

  // 5. Secure RPC: submit_quiz_answers
  const testIdToSubmit = firstTestId || 'b0000000-0000-0000-0000-000000000001';
  if (testIdToSubmit) {
    try {
      const mockAnswers = {};
      if (sampleQuestionId) {
        mockAnswers[sampleQuestionId] = 'B';
      } else {
        mockAnswers['c0000000-0000-0000-0000-000000000001'] = 'B';
      }

      const { data: submission, error } = await client.rpc('submit_quiz_answers', {
        p_test_id: testIdToSubmit,
        p_answers: mockAnswers,
        p_time_taken_seconds: 45,
      });

      if (error) {
        console.error('❌ [Check 5: submit_quiz_answers RPC] FAILED:', error.message);
        passed = false;
      } else {
        console.log(`✓ [Check 5: submit_quiz_answers RPC] PASSED:`);
        console.log(`  - Submission ID: ${submission.submissionId}`);
        console.log(`  - Server-calculated Score: ${submission.score}/${submission.maxScore} (${submission.percentage}%)`);
        console.log(`  - Explanations returned post-submission: ${submission.questionResults?.length || 0}`);
      }
    } catch (err) {
      console.error('❌ [Check 5: submit_quiz_answers RPC] EXCEPTION:', err);
      passed = false;
    }
  }

  // 6. Admin Mutation Blocked for Anon Client
  try {
    const { error } = await client.from('categories').insert({
      name: 'Hacker Category',
      slug: 'hacker-cat-' + Date.now(),
      icon: 'computer',
      is_active: true,
      sort_order: 99,
    });

    if (error) {
      console.log('✓ [Check 6: Admin Write Authorization] PASSED: Unauthorized write blocked by RLS.');
    } else {
      console.error('❌ [Check 6: Admin Write Authorization] FAILED: Anonymous client was able to insert into categories!');
      passed = false;
    }
  } catch (err) {
    console.log('✓ [Check 6: Admin Write Authorization] PASSED (rejected with exception):', err.message);
  }

  console.log('\n====================================================');
  if (passed) {
    console.log('ALL LIVE SUPABASE VERIFICATION CHECKS PASSED');
  } else {
    console.log('SOME CHECKS FAILED — Review errors above');
    process.exit(1);
  }
  console.log('====================================================');
}

runVerification();
