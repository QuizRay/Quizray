# QuizRay — Modern Online Examination & MCQ Platform

QuizRay is a modern, high-performance web application designed for timed multiple-choice assessments, adaptive scoring, and comprehensive curriculum management.

Built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Vite**, and **Supabase**.

---

## Current Platform Capabilities

### 1. Student Experience Flow (Phase 1 & Phase 2)
* **Home Page**: Branded hero, curriculum domain cards, popular assessment modules, feature overview, and responsive footer.
* **Category View (`#/category/:id`)**: Browse domain-specific tests with difficulty filters and question count metrics.
* **Assessment Catalog (`#/tests`)**: Searchable and filterable catalog across all published practice tests.
* **Pre-Test Instructions (`#/test/:id/instructions`)**: Detailed rules, question breakdown, time allocations, and marking scheme.
* **Distraction-Free Quiz Engine (`#/test/:id/quiz`)**:
  * Elapsed-time-derived countdown timer (resilient to page refreshes)
  * Interactive question palette with visual states (current, answered, unanswered, marked for review)
  * Option selection, deselect/clear answer, and next/prev navigation
  * Confirmation modal with real-time attempt breakdown before submission
* **Scorecard & Detailed Solutions (`#/test/:id/result`)**:
  * Score percentage, accuracy, and elapsed time
  * Filterable solutions review (All, Correct, Incorrect, Unattempted)
  * Curriculum-verified explanations revealed post-submission

### 2. Admin Foundation & Control Panel (Phase 2)
* **Administrative Overview (`#/admin`)**: System metrics (categories, tests, published count, question bank, submissions) and security checklist.
* **Assessment Manager (`#/admin/tests`)**: Full CRUD operations on tests, one-click publish/unpublish toggle, duration and marks configuration.
* **Question Bank Manager (`#/admin/questions`)**: Filter by test, add/edit/delete MCQs with 4 options, designate correct option, and write pedagogical explanations.
* **Curriculum Category Manager (`#/admin/categories`)**: Manage knowledge streams, icons, sorting orders, and availability.
* **Admin Authentication**: Supabase Auth integration with local fallback simulation for development.

---

## Security & Architectural Guarantees

QuizRay implements strict zero-trust principles to protect assessment integrity:

1. **Answer Key Protection**:
   * During test-taking, students fetch questions exclusively through the secure server RPC `get_test_for_student`.
   * The database omits `correct_option_id` and `explanation` from the returned payload, ensuring answer keys are never exposed in browser memory or network payloads before submission.
2. **Server-Side Scoring Verification**:
   * Students never submit raw score numbers, correct counts, or percentages.
   * Submissions pass `{ test_id, answers, time_taken_seconds }` to the `submit_quiz_answers` database function. The database calculates the score against authoritative answer keys and logs the verified submission.
3. **Row Level Security (RLS) & Role Isolation**:
   * Direct table access to `questions` is restricted.
   * Modifying categories, tests, questions, options, or answer keys requires authentication verified against the `admin_users` table via server-side function `is_admin()`.
4. **Dual-Mode Fallback**:
   * If Supabase environment variables are missing, QuizRay runs seamlessly in **Local Fallback Mode** with verified local mock data while enforcing the exact same answer-stripping rules.
   * When Supabase is configured, live database queries are executed. Any unexpected network or database error renders an informative `ErrorState` with retry options.

---

## Supabase Relational Database Setup

To connect QuizRay to a live Supabase project:

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public API Key** from **Project Settings → API**.

### Step 2: Apply the Database Schema & RLS Policies
1. Open the **SQL Editor** in your Supabase Dashboard.
2. Copy and execute the contents of [`supabase/migrations/20260905000000_initial_schema.sql`](./supabase/migrations/20260905000000_initial_schema.sql).
3. This creates:
   * Tables: `categories`, `tests`, `questions`, `options`, `submissions`, `admin_users`
   * Indexes and foreign key constraints
   * Row Level Security (RLS) policies
   * Stored procedures: `is_admin()`, `get_test_for_student()`, `submit_quiz_answers()`

### Step 3: Seed Initial Curriculum Data
1. In the Supabase **SQL Editor**, copy and execute [`supabase/seed.sql`](./supabase/seed.sql).
2. This populates 8 curriculum categories, 6 comprehensive tests, and 30 verified questions with 120 options and explanations.

### Step 4: Configure Local Environment
Create a `.env` file in the project root (based on `.env.example`):

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-public-key...
```

> **IMPORTANT**: Never put the Supabase `service_role` key into client-side `.env` files. Only the public `anon` key should be used in frontend applications.

### Step 5: Create an Administrator User
1. Go to **Authentication → Users** in your Supabase Dashboard and click **Add User** (e.g. `admin@quizray.io`).
2. Copy the newly created user's UUID.
3. In the **SQL Editor**, grant admin permissions by inserting their UUID into `admin_users`:

```sql
INSERT INTO admin_users (user_id)
VALUES ('PASTE-USER-UUID-HERE')
ON CONFLICT (user_id) DO NOTHING;
```

---

## Development & Verification

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` to explore the student platform or `http://localhost:5173/#/admin` for the admin portal.

### Run Linter
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```
Builds optimized production assets to `dist/`.
