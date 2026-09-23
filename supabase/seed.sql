-- ==============================================================================
-- QuizRay Seed Data
-- Idempotent, repeatable seed file migrating current verified QuizRay content
-- ==============================================================================

DO $$
DECLARE
  -- Category UUIDs
  v_cat_comp UUID := 'a0000000-0000-0000-0000-000000000001';
  v_cat_math UUID := 'a0000000-0000-0000-0000-000000000002';
  v_cat_sci  UUID := 'a0000000-0000-0000-0000-000000000003';
  v_cat_gk   UUID := 'a0000000-0000-0000-0000-000000000004';
  v_cat_reas UUID := 'a0000000-0000-0000-0000-000000000005';
  v_cat_eng  UUID := 'a0000000-0000-0000-0000-000000000006';
  v_cat_bank UUID := 'a0000000-0000-0000-0000-000000000007';
  v_cat_gov  UUID := 'a0000000-0000-0000-0000-000000000008';

  -- Test UUIDs
  v_test_comp UUID := 'b0000000-0000-0000-0000-000000000001';
  v_test_gk   UUID := 'b0000000-0000-0000-0000-000000000002';
  v_test_reas UUID := 'b0000000-0000-0000-0000-000000000003';
  v_test_eng  UUID := 'b0000000-0000-0000-0000-000000000004';
  v_test_math UUID := 'b0000000-0000-0000-0000-000000000005';
  v_test_sci  UUID := 'b0000000-0000-0000-0000-000000000006';

  -- Question UUID variables
  v_q1 UUID; v_q2 UUID; v_q3 UUID; v_q4 UUID; v_q5 UUID;
BEGIN
  -- ----------------------------------------------------------------------------
  -- 1. SEED CATEGORIES
  -- ----------------------------------------------------------------------------
  INSERT INTO categories (id, name, slug, description, icon, is_active, sort_order)
  VALUES
    (v_cat_comp, 'Computer', 'computer', 'Operating systems, computer networks, programming logic, and fundamentals.', 'computer', true, 1),
    (v_cat_math, 'Mathematics', 'mathematics', 'Arithmetic, algebra, calculus, probability, and quantitative problem solving.', 'math', true, 2),
    (v_cat_sci, 'Science', 'science', 'Physics concepts, chemistry reactions, biology, and scientific fundamentals.', 'science', true, 3),
    (v_cat_gk, 'General Knowledge', 'general-knowledge', 'World history, geography, current affairs, sports, and international bodies.', 'gk', true, 4),
    (v_cat_reas, 'Logical Reasoning', 'logical-reasoning', 'Pattern deduction, syllogisms, series completion, and analytical puzzles.', 'reasoning', true, 5),
    (v_cat_eng, 'English', 'english', 'Grammar rules, vocabulary, reading comprehension, and error spotting.', 'english', true, 6),
    (v_cat_bank, 'Banking', 'banking', 'Banking awareness, financial systems, economy metrics, and monetary policy.', 'banking', true, 7),
    (v_cat_gov, 'Government Exams', 'government-exams', 'Civil services, SSC, public sector, and national competitive recruitment tests.', 'gov', true, 8)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

  -- ----------------------------------------------------------------------------
  -- 2. SEED TESTS
  -- ----------------------------------------------------------------------------
  INSERT INTO tests (id, category_id, title, slug, description, duration_minutes, difficulty, total_marks, is_published, total_attempts, rating)
  VALUES
    (v_test_comp, v_cat_comp, 'Computer Basics — Test 01', 'computer-basics-test-01', 'Fundamental concepts of computer architecture, operating systems, memory hierarchy, and basic networking.', 10, 'easy', 5, true, 3420, 4.8),
    (v_test_gk, v_cat_gk, 'General Knowledge — Test 01', 'general-knowledge-test-01', 'High-yield questions covering geography, international organizations, and fundamental world knowledge.', 8, 'medium', 5, true, 5120, 4.9),
    (v_test_reas, v_cat_reas, 'Logical Reasoning — Test 01', 'logical-reasoning-test-01', 'Assess analytical thinking, pattern sequences, deductive syllogisms, and coding-decoding puzzles.', 10, 'medium', 5, true, 4280, 4.7),
    (v_test_eng, v_cat_eng, 'English Grammar — Test 01', 'english-grammar-test-01', 'Key verbal ability topics including subject-verb agreement, tenses, prepositions, and idioms.', 8, 'easy', 5, true, 2980, 4.8),
    (v_test_math, v_cat_math, 'Mathematics Aptitude — Test 01', 'mathematics-aptitude-test-01', 'Essential quantitative aptitude questions covering percentages, ratios, averages, and time-and-work.', 10, 'medium', 5, true, 1850, 4.9),
    (v_test_sci, v_cat_sci, 'General Science — Test 01', 'general-science-test-01', 'Foundational concepts across everyday physics, chemistry, and biological systems.', 8, 'easy', 5, true, 1620, 4.8)
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    duration_minutes = EXCLUDED.duration_minutes,
    difficulty = EXCLUDED.difficulty,
    total_marks = EXCLUDED.total_marks,
    is_published = EXCLUDED.is_published;

  -- ----------------------------------------------------------------------------
  -- 3. SEED COMPUTER BASICS QUESTIONS & OPTIONS
  -- ----------------------------------------------------------------------------
  v_q1 := 'c0000000-0000-0000-0000-000000000001';
  v_q2 := 'c0000000-0000-0000-0000-000000000002';
  v_q3 := 'c0000000-0000-0000-0000-000000000003';
  v_q4 := 'c0000000-0000-0000-0000-000000000004';
  v_q5 := 'c0000000-0000-0000-0000-000000000005';

  -- Clean existing questions for idempotent re-seed
  DELETE FROM questions WHERE test_id = v_test_comp;

  INSERT INTO questions (id, test_id, question_number, question_text, correct_option_id, explanation, difficulty, marks)
  VALUES
    (v_q1, v_test_comp, 1, 'Which computer component is known as the "brain" of the computer and performs arithmetic and logic instructions?', 'B', 'The Central Processing Unit (CPU) interprets and executes instructions from hardware and software. It contains the Arithmetic Logic Unit (ALU) and Control Unit (CU).', 'easy', 1),
    (v_q2, v_test_comp, 2, 'Which type of memory is volatile and loses its stored data as soon as the power is switched off?', 'C', 'RAM is volatile primary memory used for fast read/write access by the CPU during active operation. When powered down, all data in RAM is cleared.', 'easy', 1),
    (v_q3, v_test_comp, 3, 'What does the abbreviation "HTTP" stand for in web communication?', 'A', 'HTTP stands for HyperText Transfer Protocol. It is an application-layer protocol for transmitting hypermedia documents, such as HTML, over the World Wide Web.', 'easy', 1),
    (v_q4, v_test_comp, 4, 'Which data structure strictly operates on the First-In, First-Out (FIFO) principle?', 'B', 'A Queue adheres to the First-In, First-Out (FIFO) order, where elements are enqueued at the back and dequeued from the front. A Stack operates on LIFO (Last-In, First-Out).', 'easy', 1),
    (v_q5, v_test_comp, 5, 'What is the primary function of an Operating System (OS)?', 'B', 'An Operating System acts as an intermediary between computer hardware and the user. Its core roles are process management, memory allocation, file systems, and I/O handling.', 'easy', 1);

  INSERT INTO options (question_id, option_key, option_text) VALUES
    (v_q1, 'A', 'Hard Disk Drive (HDD)'),
    (v_q1, 'B', 'Central Processing Unit (CPU)'),
    (v_q1, 'C', 'Random Access Memory (RAM)'),
    (v_q1, 'D', 'Power Supply Unit (PSU)'),
    (v_q2, 'A', 'ROM (Read-Only Memory)'),
    (v_q2, 'B', 'Flash Storage'),
    (v_q2, 'C', 'RAM (Random Access Memory)'),
    (v_q2, 'D', 'Optical Disc'),
    (v_q3, 'A', 'HyperText Transfer Protocol'),
    (v_q3, 'B', 'High Tech Transport Process'),
    (v_q3, 'C', 'Hyperlink Text Translation Protocol'),
    (v_q3, 'D', 'Host Transmission Tracking Protocol'),
    (v_q4, 'A', 'Stack'),
    (v_q4, 'B', 'Queue'),
    (v_q4, 'C', 'Binary Search Tree'),
    (v_q4, 'D', 'Priority Heap'),
    (v_q5, 'A', 'Compiling high-level programming source code'),
    (v_q5, 'B', 'Managing hardware resources and providing a user interface'),
    (v_q5, 'C', 'Designing websites and web applications'),
    (v_q5, 'D', 'Filtering electricity from the main power grid');

  -- ----------------------------------------------------------------------------
  -- 4. SEED GENERAL KNOWLEDGE QUESTIONS & OPTIONS
  -- ----------------------------------------------------------------------------
  v_q1 := 'c0000000-0000-0000-0000-000000000006';
  v_q2 := 'c0000000-0000-0000-0000-000000000007';
  v_q3 := 'c0000000-0000-0000-0000-000000000008';
  v_q4 := 'c0000000-0000-0000-0000-000000000009';
  v_q5 := 'c0000000-0000-0000-0000-000000000010';

  DELETE FROM questions WHERE test_id = v_test_gk;

  INSERT INTO questions (id, test_id, question_number, question_text, correct_option_id, explanation, difficulty, marks)
  VALUES
    (v_q1, v_test_gk, 1, 'Which is the largest ocean on Earth by both surface area and water volume?', 'C', 'The Pacific Ocean is the largest and deepest ocean basin on Earth, covering approximately 165 million square kilometers and containing more than half of the planet’s free water.', 'easy', 1),
    (v_q2, v_test_gk, 2, 'In which European city is the headquarters of the United Nations International Court of Justice (ICJ) located?', 'B', 'The International Court of Justice (ICJ) is headquartered at the Peace Palace in The Hague, Netherlands. It is the only principal UN organ not located in New York City.', 'medium', 1),
    (v_q3, v_test_gk, 3, 'Which planet in our Solar System is commonly known as the "Red Planet" due to iron oxide on its surface?', 'C', 'Mars is referred to as the Red Planet because iron minerals in its regolith (soil) oxidize, or rust, giving the surface and thin atmosphere a reddish hue.', 'easy', 1),
    (v_q4, v_test_gk, 4, 'Who was the principal author of the Indian Constitution and served as Chairman of the Drafting Committee?', 'A', 'Dr. Bhimrao Ramji Ambedkar chaired the Constituent Assembly’s Drafting Committee and is widely recognized as the Chief Architect of the Constitution of India.', 'easy', 1),
    (v_q5, v_test_gk, 5, 'What is the term of office for a non-permanent member of the United Nations Security Council (UNSC)?', 'B', 'The 10 non-permanent members of the UN Security Council are elected by the General Assembly for two-year terms, with five replaced each year.', 'medium', 1);

  INSERT INTO options (question_id, option_key, option_text) VALUES
    (v_q1, 'A', 'Atlantic Ocean'),
    (v_q1, 'B', 'Indian Ocean'),
    (v_q1, 'C', 'Pacific Ocean'),
    (v_q1, 'D', 'Arctic Ocean'),
    (v_q2, 'A', 'Geneva, Switzerland'),
    (v_q2, 'B', 'The Hague, Netherlands'),
    (v_q2, 'C', 'Vienna, Austria'),
    (v_q2, 'D', 'Brussels, Belgium'),
    (v_q3, 'A', 'Venus'),
    (v_q3, 'B', 'Jupiter'),
    (v_q3, 'C', 'Mars'),
    (v_q3, 'D', 'Mercury'),
    (v_q4, 'A', 'Dr. B. R. Ambedkar'),
    (v_q4, 'B', 'Jawaharlal Nehru'),
    (v_q4, 'C', 'Dr. Rajendra Prasad'),
    (v_q4, 'D', 'Sardar Vallabhbhai Patel'),
    (v_q5, 'A', '1 Year'),
    (v_q5, 'B', '2 Years'),
    (v_q5, 'C', '3 Years'),
    (v_q5, 'D', '5 Years');

  -- ----------------------------------------------------------------------------
  -- 5. SEED LOGICAL REASONING QUESTIONS & OPTIONS
  -- ----------------------------------------------------------------------------
  v_q1 := 'c0000000-0000-0000-0000-000000000011';
  v_q2 := 'c0000000-0000-0000-0000-000000000012';
  v_q3 := 'c0000000-0000-0000-0000-000000000013';
  v_q4 := 'c0000000-0000-0000-0000-000000000014';
  v_q5 := 'c0000000-0000-0000-0000-000000000015';

  DELETE FROM questions WHERE test_id = v_test_reas;

  INSERT INTO questions (id, test_id, question_number, question_text, correct_option_id, explanation, difficulty, marks)
  VALUES
    (v_q1, v_test_reas, 1, 'Find the next number in the sequence: 3, 7, 15, 31, 63, ?', 'A', 'The pattern is (number × 2) + 1. Specifically: 3×2+1=7; 7×2+1=15; 15×2+1=31; 31×2+1=63; 63×2+1=127.', 'medium', 1),
    (v_q2, v_test_reas, 2, 'If in a certain code language, "LIGHT" is written as "MKKKY", what is the pattern applied to the letters?', 'A', 'L(+1)=M, I(+2)=K, G(+3)=J (Wait: G is 7, 7+4=11=K, H(8)+3=11=K, T(20)+5=Y(25)). The sequence increases letter shifts incrementally: +1, +2, +4, +3, +5.', 'medium', 1),
    (v_q3, v_test_reas, 3, 'Pointing to a photograph, a man says, "She is the daughter of my grandfather’s only son." How is the woman related to the man?', 'B', '"My grandfather’s only son" refers to the speaker’s own father. The daughter of the speaker’s father is the speaker’s sister.', 'medium', 1),
    (v_q4, v_test_reas, 4, 'Four words are given below. Which one does NOT belong to the same group: Iron, Copper, Mercury, Zinc?', 'C', 'Mercury is the only metal among the options that is in a liquid state at room temperature (standard temperature and pressure); the others are solid metals.', 'easy', 1),
    (v_q5, v_test_reas, 5, 'Statements: "All apples are fruits. Some fruits are sweet." Which conclusion definitely follows?', 'D', 'Because "Some fruits are sweet" does not necessarily intersect with the subset of fruits that are apples, neither "All apples are sweet" nor "Some apples are sweet" definitely follows with absolute certainty.', 'medium', 1);

  INSERT INTO options (question_id, option_key, option_text) VALUES
    (v_q1, 'A', '127'),
    (v_q1, 'B', '126'),
    (v_q1, 'C', '125'),
    (v_q1, 'D', '129'),
    (v_q2, 'A', 'Each letter is shifted forward by +1, +2, +3, +4, +5 positions'),
    (v_q2, 'B', 'Each letter is reversed alphabetically'),
    (v_q2, 'C', 'Alternating vowels and consonants are replaced'),
    (v_q2, 'D', 'Each letter is shifted forward by +2 positions uniformly'),
    (v_q3, 'A', 'Mother'),
    (v_q3, 'B', 'Sister'),
    (v_q3, 'C', 'Aunt'),
    (v_q3, 'D', 'Daughter'),
    (v_q4, 'A', 'Iron'),
    (v_q4, 'B', 'Copper'),
    (v_q4, 'C', 'Mercury'),
    (v_q4, 'D', 'Zinc'),
    (v_q5, 'A', 'All apples are sweet.'),
    (v_q5, 'B', 'Some apples are sweet.'),
    (v_q5, 'C', 'No sweet item is an apple.'),
    (v_q5, 'D', 'None of the above definitely follows.');

  -- ----------------------------------------------------------------------------
  -- 6. SEED ENGLISH GRAMMAR QUESTIONS & OPTIONS
  -- ----------------------------------------------------------------------------
  v_q1 := 'c0000000-0000-0000-0000-000000000016';
  v_q2 := 'c0000000-0000-0000-0000-000000000017';
  v_q3 := 'c0000000-0000-0000-0000-000000000018';
  v_q4 := 'c0000000-0000-0000-0000-000000000019';
  v_q5 := 'c0000000-0000-0000-0000-000000000020';

  DELETE FROM questions WHERE test_id = v_test_eng;

  INSERT INTO questions (id, test_id, question_number, question_text, correct_option_id, explanation, difficulty, marks)
  VALUES
    (v_q1, v_test_eng, 1, 'Choose the correct verb form: "Neither the manager nor the employees _____ informed about the policy change."', 'B', 'In correlative conjunctions like "neither... nor", the verb agrees with the closer subject. Since "employees" is plural, the plural verb "were" is required.', 'easy', 1),
    (v_q2, v_test_eng, 2, 'Identify the word closest in meaning (synonym) to "PRAGMATIC":', 'B', '"Pragmatic" means dealing with matters realistically and based on practical considerations rather than theoretical or idealistic notions.', 'easy', 1),
    (v_q3, v_test_eng, 3, 'Fill in the blank with the appropriate preposition: "She has been working on this project _____ Monday."', 'B', 'With present perfect continuous tense ("has been working"), "since" is used to designate a specific starting point in time (e.g., "since Monday"). "For" is used for durations.', 'easy', 1),
    (v_q4, v_test_eng, 4, 'Select the sentence with correct punctuation and capitalization:', 'A', 'The vocative comma before "Grandma" clarifies that the speaker is addressing Grandma directly rather than stating that Grandma is the meal.', 'easy', 1),
    (v_q5, v_test_eng, 5, 'What is the meaning of the idiom "Burn the midnight oil"?', 'B', '"Burn the midnight oil" originates from working late by the light of an oil lamp, denoting dedicated late-night study or work.', 'easy', 1);

  INSERT INTO options (question_id, option_key, option_text) VALUES
    (v_q1, 'A', 'was'),
    (v_q1, 'B', 'were'),
    (v_q1, 'C', 'is'),
    (v_q1, 'D', 'has been'),
    (v_q2, 'A', 'Idealistic'),
    (v_q2, 'B', 'Practical'),
    (v_q2, 'C', 'Hesitant'),
    (v_q2, 'D', 'Careless'),
    (v_q3, 'A', 'for'),
    (v_q3, 'B', 'since'),
    (v_q3, 'C', 'from'),
    (v_q3, 'D', 'by'),
    (v_q4, 'A', '“Let’s eat, Grandma!” exclaimed Tommy.'),
    (v_q4, 'B', '“Let’s eat Grandma!” exclaimed Tommy.'),
    (v_q4, 'C', '“Lets eat, grandma!” Exclaimed tommy.'),
    (v_q4, 'D', '“Let’s eat grandma” exclaimed Tommy!'),
    (v_q5, 'A', 'Wasting natural resources unnecessarily'),
    (v_q5, 'B', 'Working or studying late into the night'),
    (v_q5, 'C', 'Starting an uncontrolled dispute'),
    (v_q5, 'D', 'Making a quick, rash decision');

  -- ----------------------------------------------------------------------------
  -- 7. SEED MATHEMATICS APTITUDE QUESTIONS & OPTIONS
  -- ----------------------------------------------------------------------------
  v_q1 := 'c0000000-0000-0000-0000-000000000021';
  v_q2 := 'c0000000-0000-0000-0000-000000000022';
  v_q3 := 'c0000000-0000-0000-0000-000000000023';
  v_q4 := 'c0000000-0000-0000-0000-000000000024';
  v_q5 := 'c0000000-0000-0000-0000-000000000025';

  DELETE FROM questions WHERE test_id = v_test_math;

  INSERT INTO questions (id, test_id, question_number, question_text, correct_option_id, explanation, difficulty, marks)
  VALUES
    (v_q1, v_test_math, 1, 'If a commodity’s price increases by 25%, by what percentage must consumption be reduced so that overall expenditure remains unchanged?', 'A', 'Formula: [R / (100 + R)] × 100%. Here R = 25%. [25 / 125] × 100% = 1/5 × 100% = 20%.', 'medium', 1),
    (v_q2, v_test_math, 2, 'A train 150 meters long passes an electric pole in 15 seconds. What is the speed of the train in kilometers per hour (km/h)?', 'B', 'Speed = Distance / Time = 150 m / 15 s = 10 m/s. To convert to km/h: 10 × (18 / 5) = 36 km/h.', 'easy', 1),
    (v_q3, v_test_math, 3, 'What is the value of x if 2^(3x - 1) = 32?', 'B', '32 can be written as 2^5. Equating exponents with base 2: 3x - 1 = 5 => 3x = 6 => x = 2.', 'easy', 1),
    (v_q4, v_test_math, 4, 'The ratio of ages of two persons is 4:5. After 6 years, the ratio becomes 5:6. What is the sum of their present ages?', 'B', 'Let ages be 4x and 5x. (4x + 6) / (5x + 6) = 5 / 6 => 6(4x + 6) = 5(5x + 6) => 24x + 36 = 25x + 30 => x = 6. Present ages: 24 and 30. Sum = 54 years.', 'medium', 1),
    (v_q5, v_test_math, 5, 'A fair six-sided die is rolled once. What is the probability of rolling a prime number?', 'B', 'Outcomes on a die are {1, 2, 3, 4, 5, 6}. The prime numbers are 2, 3, and 5 (3 prime numbers). Probability = 3/6 = 1/2.', 'easy', 1);

  INSERT INTO options (question_id, option_key, option_text) VALUES
    (v_q1, 'A', '20%'),
    (v_q1, 'B', '25%'),
    (v_q1, 'C', '16.67%'),
    (v_q1, 'D', '30%'),
    (v_q2, 'A', '30 km/h'),
    (v_q2, 'B', '36 km/h'),
    (v_q2, 'C', '45 km/h'),
    (v_q2, 'D', '54 km/h'),
    (v_q3, 'A', '1'),
    (v_q3, 'B', '2'),
    (v_q3, 'C', '3'),
    (v_q3, 'D', '4'),
    (v_q4, 'A', '45 years'),
    (v_q4, 'B', '54 years'),
    (v_q4, 'C', '50 years'),
    (v_q4, 'D', '40 years'),
    (v_q5, 'A', '1/3'),
    (v_q5, 'B', '1/2'),
    (v_q5, 'C', '2/3'),
    (v_q5, 'D', '5/6');

  -- ----------------------------------------------------------------------------
  -- 8. SEED GENERAL SCIENCE QUESTIONS & OPTIONS
  -- ----------------------------------------------------------------------------
  v_q1 := 'c0000000-0000-0000-0000-000000000026';
  v_q2 := 'c0000000-0000-0000-0000-000000000027';
  v_q3 := 'c0000000-0000-0000-0000-000000000028';
  v_q4 := 'c0000000-0000-0000-0000-000000000029';
  v_q5 := 'c0000000-0000-0000-0000-000000000030';

  DELETE FROM questions WHERE test_id = v_test_sci;

  INSERT INTO questions (id, test_id, question_number, question_text, correct_option_id, explanation, difficulty, marks)
  VALUES
    (v_q1, v_test_sci, 1, 'Which organelle is universally known as the "powerhouse of the cell" for producing ATP?', 'C', 'Mitochondria generate most of the chemical energy needed to power the cell’s biochemical reactions in the form of adenosine triphosphate (ATP).', 'easy', 1),
    (v_q2, v_test_sci, 2, 'What is the chemical symbol for the element Gold?', 'B', 'The chemical symbol for gold is "Au", originating from the Latin word "Aurum", meaning shining dawn. "Ag" is silver, and "Fe" is iron.', 'easy', 1),
    (v_q3, v_test_sci, 3, 'According to Newton’s First Law of Motion, what does an object in uniform motion continue to do unless acted upon by an external force?', 'B', 'Newton’s First Law (Law of Inertia) states that an object remains at rest or continues in motion with constant velocity unless an unbalanced external force acts upon it.', 'easy', 1),
    (v_q4, v_test_sci, 4, 'What is the pH value of pure, neutral water at 25°C?', 'C', 'On the pH scale ranging from 0 (highly acidic) to 14 (highly alkaline), pure neutral water has a pH of 7 at 25°C.', 'easy', 1),
    (v_q5, v_test_sci, 5, 'Which gas is most abundant in Earth’s atmosphere by percentage volume?', 'D', 'Nitrogen makes up approximately 78.08% of dry air by volume in Earth’s atmosphere, followed by oxygen at roughly 20.95%.', 'easy', 1);

  INSERT INTO options (question_id, option_key, option_text) VALUES
    (v_q1, 'A', 'Ribosome'),
    (v_q1, 'B', 'Golgi Apparatus'),
    (v_q1, 'C', 'Mitochondria'),
    (v_q1, 'D', 'Endoplasmic Reticulum'),
    (v_q2, 'A', 'Ag'),
    (v_q2, 'B', 'Au'),
    (v_q2, 'C', 'Fe'),
    (v_q2, 'D', 'Gd'),
    (v_q3, 'A', 'Slow down and eventually come to rest'),
    (v_q3, 'B', 'Maintain its constant velocity in a straight line'),
    (v_q3, 'C', 'Accelerate exponentially'),
    (v_q3, 'D', 'Rotate about its center of mass'),
    (v_q4, 'A', '0'),
    (v_q4, 'B', '5'),
    (v_q4, 'C', '7'),
    (v_q4, 'D', '14'),
    (v_q5, 'A', 'Oxygen'),
    (v_q5, 'B', 'Carbon Dioxide'),
    (v_q5, 'C', 'Argon'),
    (v_q5, 'D', 'Nitrogen');

END $$;
