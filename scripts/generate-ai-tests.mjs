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

const env = loadEnv();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const SB_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF || 'rrousigtxiaylybloliv';

if (!GEMINI_API_KEY || !SB_TOKEN) {
  console.error('Missing required environment variables: GEMINI_API_KEY or SUPABASE_ACCESS_TOKEN in .env');
  process.exit(1);
}

const TESTS_TO_GENERATE = [
  {
    categoryId: 'a0000000-0000-0000-0000-000000000008', // Government Exams
    categoryName: 'Government Exams',
    title: 'SSC CGL — General Awareness Mock 01',
    slug: 'ssc-cgl-general-awareness-mock-01',
    description: 'Comprehensive general awareness practice test covering Indian Polity, History, and Geography for SSC CGL aspirants.',
    difficulty: 'medium',
    durationMinutes: 10,
    topic: 'Indian Polity, History & Geography for SSC CGL Exam',
    questionCount: 5,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000008', // Government Exams
    categoryName: 'Government Exams',
    title: 'Railway RRB NTPC — General Science & GK',
    slug: 'railway-rrb-ntpc-general-science-gk',
    description: 'Targeted practice test featuring high-frequency questions for Railway Recruitment Board (RRB) NTPC exams.',
    difficulty: 'easy',
    durationMinutes: 10,
    topic: 'Railway RRB NTPC General Science, Inventions, and Indian Heritage',
    questionCount: 5,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000007', // Banking
    categoryName: 'Banking',
    title: 'Banking Awareness & Financial Systems — Test 01',
    slug: 'banking-awareness-financial-systems-01',
    description: 'Essential banking terms, RBI monetary policies, and financial sector concepts for IBPS & SBI exams.',
    difficulty: 'medium',
    durationMinutes: 10,
    topic: 'RBI Functions, Monetary Policy, Digital Banking, and Capital Markets',
    questionCount: 5,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000007', // Banking
    categoryName: 'Banking',
    title: 'SBI PO — Quantitative Aptitude Practice',
    slug: 'sbi-po-quantitative-aptitude-practice',
    description: 'High-yield math questions covering Percentages, Ratio, and Time & Work for bank probationary officer exams.',
    difficulty: 'hard',
    durationMinutes: 12,
    topic: 'Quantitative Aptitude, Percentages, Profit and Loss, and Simple Interest for SBI PO',
    questionCount: 5,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000001', // Computer
    categoryName: 'Computer',
    title: 'Computer Awareness & Networking — Test 02',
    slug: 'computer-awareness-networking-02',
    description: 'Test your understanding of OSI layers, IP addressing, cyber security, and hardware architecture.',
    difficulty: 'medium',
    durationMinutes: 10,
    topic: 'Computer Networking, Cyber Security, Protocols (HTTP, TCP, DNS), and OS Basics',
    questionCount: 5,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000005', // Logical Reasoning
    categoryName: 'Logical Reasoning',
    title: 'Logical Reasoning — Syllogisms & Blood Relations',
    slug: 'logical-reasoning-syllogisms-blood-relations',
    description: 'Sharpen your analytical deductions, Venn diagrams, syllogisms, and relationship reasoning.',
    difficulty: 'medium',
    durationMinutes: 10,
    topic: 'Syllogism statements, Blood Relations, and Direction Sense for competitive exams',
    questionCount: 5,
  },
];

async function generateQuestionsWithGemini(spec) {
  console.log(`\nGenerating ${spec.questionCount} questions for: "${spec.title}"...`);
  const prompt = `You are a premier test creation expert for Indian competitive exams (SSC, UPSC, Banking, Railways).
Generate exactly ${spec.questionCount} high quality, realistic multiple choice questions for the topic: "${spec.topic}".
The difficulty level is: "${spec.difficulty}".

Return a valid JSON array of objects with the exact schema:
[
  {
    "question_text": "Clear and precise question statement?",
    "options": [
      { "option_key": "A", "option_text": "Option text" },
      { "option_key": "B", "option_text": "Option text" },
      { "option_key": "C", "option_text": "Option text" },
      { "option_key": "D", "option_text": "Option text" }
    ],
    "correct_option_id": "A", // Single letter A, B, C, or D matching the correct option_key
    "explanation": "Detailed explanation explaining why the correct answer is right with key exam facts."
  }
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawText);
}

async function runSqlQuery(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SQL Execution failed: ${err}`);
  }

  return response.json();
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function insertTestAndQuestions(spec, questions) {
  console.log(`Writing test "${spec.title}" into Supabase...`);

  const totalMarks = questions.length;
  let sql = `
ALTER TABLE public.questions DISABLE TRIGGER trg_questions_lifecycle;

DO $$
DECLARE
  v_test_id UUID;
  v_q_id UUID;
BEGIN
  -- Insert or replace test
  DELETE FROM public.tests WHERE slug = ${escapeSql(spec.slug)};

  INSERT INTO public.tests (
    category_id,
    title,
    slug,
    description,
    duration_minutes,
    difficulty,
    total_marks,
    is_published,
    rating
  ) VALUES (
    ${escapeSql(spec.categoryId)},
    ${escapeSql(spec.title)},
    ${escapeSql(spec.slug)},
    ${escapeSql(spec.description)},
    ${spec.durationMinutes},
    ${escapeSql(spec.difficulty)},
    ${totalMarks},
    true,
    4.9
  ) RETURNING id INTO v_test_id;
`;

  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    sql += `
  -- Question ${qNum}
  INSERT INTO public.questions (
    test_id,
    category_id,
    question_number,
    question_text,
    correct_option_id,
    explanation,
    difficulty,
    marks,
    status,
    source_type,
    topic,
    content_hash
  ) VALUES (
    v_test_id,
    ${escapeSql(spec.categoryId)},
    ${qNum},
    ${escapeSql(q.question_text)},
    ${escapeSql(q.correct_option_id)},
    ${escapeSql(q.explanation)},
    ${escapeSql(spec.difficulty)},
    1,
    'published',
    'curriculum',
    ${escapeSql(spec.topic)},
    encode(extensions.digest(lower(regexp_replace(trim(${escapeSql(q.question_text)}), '\\s+', ' ', 'g')), 'sha256'), 'hex')
  ) RETURNING id INTO v_q_id;

  INSERT INTO public.test_questions (test_id, question_id, question_number, marks)
  VALUES (v_test_id, v_q_id, ${qNum}, 1);
`;

    for (const opt of q.options) {
      sql += `
  INSERT INTO public.options (question_id, option_key, option_text)
  VALUES (v_q_id, ${escapeSql(opt.option_key)}, ${escapeSql(opt.option_text)});
`;
    }
  });

  sql += `
END $$;

ALTER TABLE public.questions ENABLE TRIGGER trg_questions_lifecycle;
`;

  await runSqlQuery(sql);
  console.log(`✓ Test "${spec.title}" inserted with ${questions.length} questions!`);
}

async function main() {
  console.log('====================================================');
  console.log('QuizRay Automated AI Test & Question Generator');
  console.log('Powered by Gemini 3.5 Flash + Supabase');
  console.log('====================================================');

  for (const spec of TESTS_TO_GENERATE) {
    try {
      const questions = await generateQuestionsWithGemini(spec);
      await insertTestAndQuestions(spec, questions);
    } catch (err) {
      console.error(`Error processing "${spec.title}":`, err.message);
    }
  }

  console.log('\nAll tests generated! Verifying total counts...');
  const result = await runSqlQuery(`
    SELECT c.name as category, count(DISTINCT t.id) as tests_count, count(q.id) as questions_count
    FROM categories c
    LEFT JOIN tests t ON t.category_id = c.id
    LEFT JOIN questions q ON q.test_id = t.id
    GROUP BY c.name
    ORDER BY c.name;
  `);

  console.table(result);
  console.log('\nAI Test Generation Finished Successfully!');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
