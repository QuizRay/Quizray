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
  console.error('Missing required environment variables in .env');
  process.exit(1);
}

const BATCH_TESTS = [
  {
    categoryId: 'a0000000-0000-0000-0000-000000000002', // Mathematics
    categoryName: 'Mathematics',
    title: 'Quantitative Aptitude — Percentage & Profit-Loss',
    slug: 'quantitative-aptitude-percentage-profit-loss',
    description: 'Master crucial commercial mathematics questions on cost price, selling price, discounts, and percentage change.',
    difficulty: 'medium',
    durationMinutes: 15,
    topic: 'Percentages, Profit and Loss, Marked Price, Successive Discounts, and Ratio for Competitive Exams',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000002', // Mathematics
    categoryName: 'Mathematics',
    title: 'Mathematics — Algebra & Geometry Essentials',
    slug: 'mathematics-algebra-geometry-essentials',
    description: 'High-frequency algebra formulas, quadratic equations, circle theorems, and triangle properties.',
    difficulty: 'hard',
    durationMinutes: 15,
    topic: 'Algebraic Identities, Polynomials, Mensuration, Coordinate Geometry, and Trigonometric Ratios',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000003', // Science
    categoryName: 'Science',
    title: 'General Science — Physics in Daily Life',
    slug: 'general-science-physics-in-daily-life',
    description: 'Fundamental physics concepts including Newton laws, optics, electricity, gravitation, and sound waves.',
    difficulty: 'medium',
    durationMinutes: 12,
    topic: 'Mechanics, Laws of Motion, Work Energy, Light Reflection & Refraction, Magnetism, and SI Units',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000003', // Science
    categoryName: 'Science',
    title: 'General Science — Chemistry & Human Biology',
    slug: 'general-science-chemistry-human-biology',
    description: 'Periodic table, acids and bases, human organs, vitamins, deficiency diseases, and genetics.',
    difficulty: 'medium',
    durationMinutes: 12,
    topic: 'Acids Bases Salts, Chemical Reactions, Human Digestive & Circulatory System, Vitamins, and Plant Biology',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000006', // English
    categoryName: 'English',
    title: 'English Language — Vocabulary & Idioms Master',
    slug: 'english-language-vocabulary-idioms-master',
    description: 'Enhance your verbal ability with high-frequency synonyms, antonyms, one-word substitutions, and idioms.',
    difficulty: 'medium',
    durationMinutes: 12,
    topic: 'Synonyms, Antonyms, Idioms and Phrases, One Word Substitution, and Spelling Corrections',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000006', // English
    categoryName: 'English',
    title: 'English Grammar — Spotting Errors & Sentence Correction',
    slug: 'english-grammar-spotting-errors-sentence-correction',
    description: 'Rules of subject-verb agreement, prepositions, tenses, active-passive voice, and direct-indirect speech.',
    difficulty: 'medium',
    durationMinutes: 12,
    topic: 'Spotting Errors in Sentences, Prepositions, Tense usage, Subject-Verb Agreement, and Voice/Narration',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000004', // General Knowledge
    categoryName: 'General Knowledge',
    title: 'Modern Indian History & Freedom Struggle',
    slug: 'modern-indian-history-freedom-struggle',
    description: 'Comprehensive historical test on 1857 Revolt, INC sessions, Gandhian movements, and independence leaders.',
    difficulty: 'medium',
    durationMinutes: 12,
    topic: 'Revolt of 1857, Indian National Congress, Non-Cooperation & Quit India Movement, Governor Generals, and Constitutional acts',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000004', // General Knowledge
    categoryName: 'General Knowledge',
    title: 'World Geography & Indian Physical Features',
    slug: 'world-geography-indian-physical-features',
    description: 'Key geographical facts about rivers, mountain ranges, climate zones, solar system, and oceans.',
    difficulty: 'easy',
    durationMinutes: 12,
    topic: 'Indian Rivers & Tributaries, Himalayas, Solar System planets, Ocean Currents, and Biosphere Reserves',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000008', // Government Exams
    categoryName: 'Government Exams',
    title: 'State Police & Defence Exams — Static GK',
    slug: 'state-police-defence-exams-static-gk',
    description: 'Specially curated general awareness questions for Police SI/Constable, NDA, CDS, and paramilitary exams.',
    difficulty: 'medium',
    durationMinutes: 12,
    topic: 'Indian Defence forces, National Parks, First in India, Classical Dances, and Important Dates',
    questionCount: 10,
  },
  {
    categoryId: 'a0000000-0000-0000-0000-000000000001', // Computer
    categoryName: 'Computer',
    title: 'Computer Science — Programming & Web Concepts',
    slug: 'computer-science-programming-web-concepts',
    description: 'Essential questions on data structures, Python syntax, databases (SQL), web protocols, and cloud computing.',
    difficulty: 'medium',
    durationMinutes: 12,
    topic: 'Data Structures (Arrays, Stacks, Queues), Python fundamentals, SQL queries, Cloud concepts, and Web technologies',
    questionCount: 10,
  },
];

async function generateQuestionsWithGemini(spec) {
  console.log(`\n[Gemini AI] Generating ${spec.questionCount} questions for: "${spec.title}"...`);
  const prompt = `You are a premier test creation expert for Indian competitive exams (SSC, UPSC, Banking, Railways, State exams).
Generate exactly ${spec.questionCount} high quality, realistic multiple choice questions for the topic: "${spec.topic}".
The difficulty level is: "${spec.difficulty}".

Requirements:
- Questions must be factual, unambiguous, and formatted clearly.
- Each question must have 4 options labelled A, B, C, D.
- Provide a single letter correct_option_id ("A", "B", "C", or "D").
- Provide an educational, step-by-step explanation for why the answer is correct.

Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "question_text": "Precise question statement?",
    "options": [
      { "option_key": "A", "option_text": "First option" },
      { "option_key": "B", "option_text": "Second option" },
      { "option_key": "C", "option_text": "Third option" },
      { "option_key": "D", "option_text": "Fourth option" }
    ],
    "correct_option_id": "A",
    "explanation": "Clear explanation with relevant facts."
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
        temperature: 0.25,
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
  console.log(`✓ Test "${spec.title}" successfully inserted (${questions.length} questions)!`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('====================================================');
  console.log('QuizRay Mega Batch Question Generator');
  console.log('Target: 10 New Tests — 100 Questions');
  console.log('====================================================');

  let successCount = 0;
  for (const spec of BATCH_TESTS) {
    try {
      const questions = await generateQuestionsWithGemini(spec);
      await insertTestAndQuestions(spec, questions);
      successCount += questions.length;
      await delay(2500); // 2.5s safe cooldown between batches
    } catch (err) {
      console.error(`Error processing "${spec.title}":`, err.message);
    }
  }

  console.log(`\nBatch finished! Inserted approx ${successCount} questions.`);
  console.log('\nFetching updated platform statistics from Supabase...');
  const stats = await runSqlQuery(`
    SELECT c.name as category, count(DISTINCT t.id) as tests_count, count(q.id) as questions_count
    FROM categories c
    LEFT JOIN tests t ON t.category_id = c.id
    LEFT JOIN questions q ON q.test_id = t.id
    GROUP BY c.name
    ORDER BY c.name;
  `);

  console.table(stats);
  console.log('\nMega Question Generation Completed Successfully!');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
