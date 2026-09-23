import type {
  ImportRow,
  ImportRowError,
  ImportParsedRow,
  ImportPreviewSummary,
  ImportDuplicateType,
  QuestionBankSaveInput,
  OptionId,
  QuestionBankDifficulty,
  QuestionBankSourceType,
  ImportQuestionStatus,
} from '../types/quiz';

// ------------------------------------------------------------------------------
// Category Interface for Caller Injection (Decoupled from quizService)
// ------------------------------------------------------------------------------
export interface AvailableCategory {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  is_active?: boolean;
}

// ------------------------------------------------------------------------------
// Options for validateImportRows
// ------------------------------------------------------------------------------
export interface ValidateImportOptions {
  rows: ImportRow[];
  categories: AvailableCategory[];
  existingContentHashes?: Set<string>;
}

// ------------------------------------------------------------------------------
// Validation Result
// ------------------------------------------------------------------------------
export interface ValidateImportResult {
  parsedRows: ImportParsedRow[];
  summary: ImportPreviewSummary;
}

// ------------------------------------------------------------------------------
// Helper: Question Text Normalization for Content Hash
// (Strictly replicates PostgreSQL: lower(regexp_replace(trim(question_text), '\s+', ' ', 'g')))
// ------------------------------------------------------------------------------
export function normalizeQuestionTextForHash(questionText: string): string {
  return questionText.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ------------------------------------------------------------------------------
// Helper: Deterministic SHA-256 Content Hash Generation via Web Crypto
// ------------------------------------------------------------------------------
export async function computeContentHash(questionText: string): Promise<string> {
  const normalized = normalizeQuestionTextForHash(questionText);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------------------------
// Helper: Category Resolution
// ------------------------------------------------------------------------------
function normalizeCategorySymbol(val: string): string {
  return val
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, '');
}

export function resolveCategory(
  inputCategory: string,
  categories: AvailableCategory[]
): {
  resolvedCategory: AvailableCategory | null;
  error?: { code: 'ERR_MISSING_CATEGORY' | 'ERR_UNKNOWN_CATEGORY' | 'ERR_INACTIVE_CATEGORY'; message: string };
} {
  const trimmed = inputCategory.trim();
  if (!trimmed) {
    return {
      resolvedCategory: null,
      error: {
        code: 'ERR_MISSING_CATEGORY',
        message: 'Category is required.',
      },
    };
  }

  const lowerInput = trimmed.toLowerCase();
  const symbolInput = normalizeCategorySymbol(trimmed);

  // 1. Exact Name Match (case-insensitive)
  let matched = categories.find((c) => c.name.trim().toLowerCase() === lowerInput);

  // 2. Exact Slug Match (case-insensitive)
  if (!matched) {
    matched = categories.find((c) => c.slug.trim().toLowerCase() === lowerInput);
  }

  // 3. Normalized Symbol Match (strip whitespace, hyphens, underscores)
  if (!matched) {
    matched = categories.find(
      (c) => normalizeCategorySymbol(c.name) === symbolInput || normalizeCategorySymbol(c.slug) === symbolInput
    );
  }

  if (!matched) {
    return {
      resolvedCategory: null,
      error: {
        code: 'ERR_UNKNOWN_CATEGORY',
        message: `Category "${inputCategory}" was not found in QuizRay active categories.`,
      },
    };
  }

  // Check if category is active
  const isActive = matched.isActive !== false && matched.is_active !== false;
  if (!isActive) {
    return {
      resolvedCategory: matched,
      error: {
        code: 'ERR_INACTIVE_CATEGORY',
        message: `Category "${matched.name}" is inactive. Questions cannot be assigned to inactive categories.`,
      },
    };
  }

  return { resolvedCategory: matched };
}

// ------------------------------------------------------------------------------
// Main Entrypoint: Validate Import Rows
// ------------------------------------------------------------------------------
export async function validateImportRows(options: ValidateImportOptions): Promise<ValidateImportResult> {
  const { rows, categories, existingContentHashes } = options;

  // 1. Pre-calculate content hashes for all rows to enable duplicate detection
  const rowHashes: string[] = [];
  for (const row of rows) {
    if (row.questionText && row.questionText.trim()) {
      rowHashes.push(await computeContentHash(row.questionText));
    } else {
      rowHashes.push('');
    }
  }

  // 2. Map row indices by hash to identify in-file duplicates
  const hashToRowNumbers = new Map<string, number[]>();
  for (let idx = 0; idx < rows.length; idx++) {
    const hash = rowHashes[idx];
    if (hash) {
      const existing = hashToRowNumbers.get(hash) || [];
      existing.push(rows[idx].rowNumber);
      hashToRowNumbers.set(hash, existing);
    }
  }

  const parsedRows: ImportParsedRow[] = [];

  // Summary counters
  let totalRows = rows.length;
  let validRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  let warningRows = 0;
  let readyToImport = 0;
  let skippedRows = 0;

  // 3. Validate each row independently
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const contentHash = rowHashes[idx];
    const errors: ImportRowError[] = [];
    const warnings: ImportRowError[] = [];

    // --- QUESTION TEXT VALIDATION ---
    const trimmedQuestion = (row.questionText || '').trim();
    if (!trimmedQuestion) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'question_text',
        code: 'ERR_EMPTY_QUESTION',
        severity: 'error',
        message: 'Question text is required.',
        suggestedCorrection: 'Provide a complete question statement.',
      });
    } else if (trimmedQuestion.length < 10) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'question_text',
        code: 'ERR_QUESTION_TOO_SHORT',
        severity: 'error',
        message: `Question text is too short (${trimmedQuestion.length} characters). Minimum required length is 10 characters.`,
        suppliedValue: trimmedQuestion,
        suggestedCorrection: 'Expand the question statement to at least 10 characters.',
      });
    } else if (trimmedQuestion.length > 5000) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'question_text',
        code: 'ERR_QUESTION_TOO_LONG',
        severity: 'error',
        message: `Question text exceeds maximum allowed length of 5,000 characters (${trimmedQuestion.length} characters).`,
        suppliedValue: trimmedQuestion.slice(0, 100) + '...',
      });
    }

    // --- OPTIONS VALIDATION ---
    const optionEntries: Array<{ key: OptionId; text: string }> = [
      { key: 'A', text: (row.optionA || '').trim() },
      { key: 'B', text: (row.optionB || '').trim() },
      { key: 'C', text: (row.optionC || '').trim() },
      { key: 'D', text: (row.optionD || '').trim() },
    ];

    for (const opt of optionEntries) {
      if (!opt.text) {
        errors.push({
          rowNumber: row.rowNumber,
          field: `option_${opt.key.toLowerCase()}`,
          code: 'ERR_EMPTY_OPTION',
          severity: 'error',
          message: `Option ${opt.key} text cannot be empty.`,
          suggestedCorrection: `Provide text for Option ${opt.key}.`,
        });
      } else if (opt.text.length > 1000) {
        errors.push({
          rowNumber: row.rowNumber,
          field: `option_${opt.key.toLowerCase()}`,
          code: 'ERR_OPTION_TOO_LONG',
          severity: 'error',
          message: `Option ${opt.key} text exceeds maximum length of 1,000 characters (${opt.text.length} characters).`,
        });
      }
    }

    // Check for duplicate option text within same question
    const normalizedOptionsMap = new Map<string, OptionId[]>();
    for (const opt of optionEntries) {
      if (opt.text) {
        const normOpt = opt.text.toLowerCase().replace(/\s+/g, ' ');
        const existingKeys = normalizedOptionsMap.get(normOpt) || [];
        existingKeys.push(opt.key);
        normalizedOptionsMap.set(normOpt, existingKeys);
      }
    }

    for (const [normOpt, keys] of normalizedOptionsMap.entries()) {
      if (keys.length > 1) {
        warnings.push({
          rowNumber: row.rowNumber,
          field: 'options',
          code: 'ERR_DUPLICATE_OPTION_TEXT',
          severity: 'warning',
          message: `Options ${keys.join(' and ')} have identical text: "${normOpt}".`,
          suggestedCorrection: 'Ensure all multiple choice options are distinct.',
        });
      }
    }

    // --- CORRECT OPTION VALIDATION ---
    const validOptionKeys: OptionId[] = ['A', 'B', 'C', 'D'];
    const correctUpper = (row.correctOption || '').trim().toUpperCase() as OptionId;

    if (!validOptionKeys.includes(correctUpper)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'correct_option',
        code: 'ERR_INVALID_CORRECT_OPTION',
        severity: 'error',
        message: `Correct option "${row.correctOption || ''}" is invalid. Must be A, B, C, or D (or 1, 2, 3, 4).`,
        suppliedValue: row.correctOption,
        suggestedCorrection: 'Designate one of A, B, C, or D as the correct option key.',
      });
    }

    // --- CATEGORY RESOLUTION ---
    const { resolvedCategory, error: catError } = resolveCategory(row.category || '', categories);
    if (catError) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'category',
        code: catError.code,
        severity: 'error',
        message: catError.message,
        suppliedValue: row.category,
        suggestedCorrection: 'Match against an existing active category name or slug.',
      });
    }

    // --- DIFFICULTY VALIDATION ---
    const diff = (row.difficulty || 'medium').toLowerCase() as QuestionBankDifficulty;
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'difficulty',
        code: 'ERR_INVALID_DIFFICULTY',
        severity: 'error',
        message: `Difficulty "${row.difficulty}" is invalid. Must be 'easy', 'medium', or 'hard'.`,
        suppliedValue: String(row.difficulty),
        suggestedCorrection: "Use 'easy', 'medium', or 'hard'.",
      });
    }

    // --- MARKS VALIDATION ---
    const marks = row.marks ?? 1;
    if (!Number.isInteger(marks) || marks < 1 || marks > 20) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'marks',
        code: 'ERR_INVALID_MARKS',
        severity: 'error',
        message: `Marks must be an integer between 1 and 20 (found "${row.marks}").`,
        suppliedValue: String(row.marks),
        suggestedCorrection: 'Specify positive marks between 1 and 20.',
      });
    }

    // --- STATUS VALIDATION ---
    const status = (row.status || 'draft').toLowerCase() as ImportQuestionStatus;
    if (status === ('archived' as string)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'status',
        code: 'ERR_INVALID_STATUS',
        severity: 'error',
        message: "Status 'archived' is not permitted on bulk import. Questions must be imported as 'draft', 'under_review', or 'published'.",
        suppliedValue: 'archived',
        suggestedCorrection: "Change status to 'draft'.",
      });
    } else if (!['draft', 'under_review', 'published'].includes(status)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'status',
        code: 'ERR_INVALID_STATUS',
        severity: 'error',
        message: `Status "${row.status}" is invalid. Allowed import values: draft, under_review, published.`,
        suppliedValue: String(row.status),
        suggestedCorrection: "Use 'draft' or 'under_review'.",
      });
    }

    // --- SOURCE TYPE VALIDATION ---
    const sourceType = (row.sourceType || 'curriculum').toLowerCase() as QuestionBankSourceType;
    if (!['official_exam', 'textbook', 'curriculum', 'ai_assisted', 'original'].includes(sourceType)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'source_type',
        code: 'ERR_INVALID_SOURCE_TYPE',
        severity: 'error',
        message: `Source type "${row.sourceType}" is invalid. Allowed values: official_exam, textbook, curriculum, ai_assisted, original.`,
        suppliedValue: String(row.sourceType),
      });
    }

    // --- AI-ASSISTED PUBLISHED GUARD (Trigger Invariant) ---
    if (sourceType === 'ai_assisted' && status === 'published') {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'status',
        code: 'ERR_AI_PUBLISHED_BLOCKED',
        severity: 'error',
        message: 'AI-assisted questions cannot be imported directly as Published. They must be created as Draft or Under Review and verified by an administrator.',
        suggestedCorrection: "Set status to 'draft' or 'under_review'.",
      });
    }

    // --- PUBLISHED EXPLANATION REQUIREMENT ---
    const explanation = row.explanation?.trim() || '';
    if (status === 'published' && !explanation) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'explanation',
        code: 'ERR_MISSING_EXPLANATION',
        severity: 'error',
        message: 'Detailed answer explanation is required when importing a question with status Published.',
        suggestedCorrection: "Provide an answer explanation or change status to 'draft'.",
      });
    }

    // --- EXAM YEAR VALIDATION ---
    if (row.examYear !== undefined && row.examYear !== null) {
      if (!Number.isInteger(row.examYear) || row.examYear < 1950 || row.examYear > 2100) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'exam_year',
          code: 'ERR_INVALID_EXAM_YEAR',
          severity: 'error',
          message: `Exam year must be an integer between 1950 and 2100 (found "${row.examYear}").`,
          suppliedValue: String(row.examYear),
        });
      }
    }

    // --- DUPLICATE DETECTION ---
    let duplicateType: ImportDuplicateType = 'none';

    // 1. In-file duplicate check
    if (contentHash) {
      const conflicts = hashToRowNumbers.get(contentHash) || [];
      const otherConflicts = conflicts.filter((r) => r !== row.rowNumber);
      if (otherConflicts.length > 0) {
        duplicateType = 'in_file';
        warnings.push({
          rowNumber: row.rowNumber,
          field: 'question_text',
          code: 'ERR_INTERNAL_DUPLICATE',
          severity: 'warning',
          message: `Duplicate question content detected in this file (identical to row(s): ${otherConflicts.join(', ')}).`,
          suggestedCorrection: 'Review spreadsheet to ensure this question is not duplicated.',
        });
      }
    }

    // 2. Database duplicate check
    if (contentHash && existingContentHashes && existingContentHashes.has(contentHash)) {
      if (duplicateType === 'in_file') {
        duplicateType = 'both';
      } else {
        duplicateType = 'in_database';
      }
      warnings.push({
        rowNumber: row.rowNumber,
        field: 'question_text',
        code: 'ERR_DATABASE_DUPLICATE',
        severity: 'warning',
        message: 'Question content already exists in the live Question Bank repository.',
        suggestedCorrection: 'Skip this duplicate to prevent creating redundant questions.',
      });
    }

    // --- OVERALL ROW VALIDITY ---
    const isValid = errors.length === 0;

    // --- PREPARE NORMALIZED SAVE PAYLOAD ---
    let normalizedData: QuestionBankSaveInput | undefined;
    if (isValid && resolvedCategory) {
      normalizedData = {
        categoryId: resolvedCategory.id,
        questionText: trimmedQuestion,
        difficulty: diff,
        marks,
        correctOptionId: correctUpper,
        explanation,
        options: [
          { optionKey: 'A', optionText: optionEntries[0].text },
          { optionKey: 'B', optionText: optionEntries[1].text },
          { optionKey: 'C', optionText: optionEntries[2].text },
          { optionKey: 'D', optionText: optionEntries[3].text },
        ],
        status,
        subject: row.subject?.trim() || null,
        topic: row.topic?.trim() || null,
        examType: row.examType?.trim() || null,
        examName: row.examName?.trim() || null,
        examYear: row.examYear ?? null,
        sourceType,
        sourceReference: row.sourceReference?.trim() || null,
        language: (row.language?.trim().toLowerCase() || 'en'),
        verificationNotes: null,
      };
    }

    // --- AGGREGATE SUMMARY METRICS ---
    if (isValid) {
      validRows++;
    } else {
      invalidRows++;
    }

    if (duplicateType !== 'none') {
      duplicateRows++;
    }

    if (warnings.length > 0) {
      warningRows++;
    }

    // Duplicate rows default to NOT ready for import
    if (isValid && duplicateType === 'none') {
      readyToImport++;
    } else {
      skippedRows++;
    }

    parsedRows.push({
      rowNumber: row.rowNumber,
      raw: row,
      normalizedData,
      errors,
      warnings,
      duplicateType,
      contentHash,
      resolvedCategoryId: resolvedCategory?.id,
      resolvedCategoryName: resolvedCategory?.name,
      isValid,
    });
  }

  const summary: ImportPreviewSummary = {
    totalRows,
    validRows,
    invalidRows,
    duplicateRows,
    warningRows,
    readyToImport,
    skippedRows,
  };

  return {
    parsedRows,
    summary,
  };
}
