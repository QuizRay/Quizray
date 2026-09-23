import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';
import type {
  ImportRow,
  ImportRowError,
  QuestionBankDifficulty,
  QuestionBankSourceType,
  ImportQuestionStatus,
} from '../types/quiz';

// ------------------------------------------------------------------------------
// Parser Limits & Constants
// ------------------------------------------------------------------------------
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_DATA_ROWS = 250; // 250 questions

export const CANONICAL_HEADERS = [
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_option',
  'explanation',
  'category',
  'difficulty',
  'marks',
  'subject',
  'topic',
  'exam_type',
  'exam_name',
  'exam_year',
  'source_type',
  'source_reference',
  'language',
  'status',
] as const;

export type CanonicalHeader = (typeof CANONICAL_HEADERS)[number];

export const REQUIRED_HEADERS: readonly CanonicalHeader[] = [
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_option',
  'category',
] as const;

export const FORBIDDEN_HEADERS: readonly string[] = [
  'id',
  'question_id',
  'questionid',
  'test_id',
  'testid',
  'question_number',
  'questionnumber',
  'created_by',
  'createdby',
  'verified_by',
  'verifiedby',
  'content_hash',
  'contenthash',
  'created_at',
  'updated_at',
] as const;

export const HEADER_ALIASES: Record<string, CanonicalHeader> = {
  question: 'question_text',
  question_text: 'question_text',
  questiontext: 'question_text',
  title: 'question_text',
  option_a: 'option_a',
  optiona: 'option_a',
  'option a': 'option_a',
  option_b: 'option_b',
  optionb: 'option_b',
  'option b': 'option_b',
  option_c: 'option_c',
  optionc: 'option_c',
  'option c': 'option_c',
  option_d: 'option_d',
  optiond: 'option_d',
  'option d': 'option_d',
  correct_option: 'correct_option',
  correctoption: 'correct_option',
  correct_answer: 'correct_option',
  correctanswer: 'correct_option',
  answer: 'correct_option',
  explanation: 'explanation',
  category: 'category',
  category_name: 'category',
  categoryname: 'category',
  difficulty: 'difficulty',
  marks: 'marks',
  subject: 'subject',
  topic: 'topic',
  exam_type: 'exam_type',
  examtype: 'exam_type',
  exam_name: 'exam_name',
  examname: 'exam_name',
  exam_year: 'exam_year',
  examyear: 'exam_year',
  source_type: 'source_type',
  sourcetype: 'source_type',
  source_reference: 'source_reference',
  sourcereference: 'source_reference',
  language: 'language',
  status: 'status',
};

// ------------------------------------------------------------------------------
// Result Interface
// ------------------------------------------------------------------------------
export interface ParseImportFileResult {
  success: boolean;
  rows: ImportRow[];
  errors: ImportRowError[];
  totalRowCount: number;
}

// ------------------------------------------------------------------------------
// Helper: Normalize Header String
// ------------------------------------------------------------------------------
export function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

// ------------------------------------------------------------------------------
// Helper: Normalize Correct Option
// ------------------------------------------------------------------------------
export function normalizeCorrectOption(val: string): string {
  const clean = val.trim().toUpperCase();
  if (clean === '1') return 'A';
  if (clean === '2') return 'B';
  if (clean === '3') return 'C';
  if (clean === '4') return 'D';
  return clean;
}

// ------------------------------------------------------------------------------
// Helper: Check If Row Is Completely Blank
// ------------------------------------------------------------------------------
function isRowBlank(row: unknown[]): boolean {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
}

// ------------------------------------------------------------------------------
// Helper: Safe Cell String Extraction
// ------------------------------------------------------------------------------
function getCellString(row: unknown[], colIndex: number | undefined): string {
  if (colIndex === undefined || colIndex < 0 || colIndex >= row.length) {
    return '';
  }
  const cell = row[colIndex];
  if (cell === null || cell === undefined) return '';
  return String(cell).trim();
}

// ------------------------------------------------------------------------------
// Parse CSV File via PapaParse
// ------------------------------------------------------------------------------
async function parseCsvToMatrix(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: false,
      encoding: 'utf-8',
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          // If critical error occurred
          const fatalError = results.errors.find((e) => e.type === 'Delimiter' || e.code === 'UndetectableDelimiter');
          if (fatalError) {
            reject(new Error(`CSV delimiter error: ${fatalError.message}`));
            return;
          }
        }
        resolve(results.data as string[][]);
      },
      error: (err) => {
        reject(new Error(`Failed to parse CSV file: ${err.message}`));
      },
    });
  });
}

// ------------------------------------------------------------------------------
// Parse XLSX File via read-excel-file
// ------------------------------------------------------------------------------
async function parseXlsxToMatrix(file: File): Promise<string[][]> {
  const sheets = await readXlsxFile(file);
  if (!sheets || sheets.length === 0) {
    return [];
  }
  // Convert first sheet's SheetData to string[][]
  const firstSheet = sheets[0];
  const matrix: string[][] = [];

  for (const row of firstSheet.data) {
    const stringRow = row.map((cell) => {
      if (cell === null || cell === undefined) return '';
      return String(cell).trim();
    });
    matrix.push(stringRow);
  }

  return matrix;
}

// ------------------------------------------------------------------------------
// Main Entrypoint: Parse Import File (CSV or XLSX)
// ------------------------------------------------------------------------------
export async function parseImportFile(file: File): Promise<ParseImportFileResult> {
  const errors: ImportRowError[] = [];

  // 1. File Size Verification (Max 5 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    errors.push({
      rowNumber: 1,
      field: 'file',
      code: 'ERR_FILE_TOO_LARGE',
      severity: 'error',
      message: `File size (${sizeMb} MB) exceeds maximum limit of 5 MB.`,
      suggestedCorrection: 'Reduce file size or split questions into multiple batches.',
    });
    return { success: false, rows: [], errors, totalRowCount: 0 };
  }

  // 2. File Format Detection
  const fileName = file.name.toLowerCase();
  const isCsv = fileName.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv';
  const isXlsx =
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel';

  if (!isCsv && !isXlsx) {
    errors.push({
      rowNumber: 1,
      field: 'file',
      code: 'ERR_INVALID_FILE_TYPE',
      severity: 'error',
      message: `Unsupported file type "${file.name}". Only .csv and .xlsx spreadsheets are accepted.`,
      suggestedCorrection: 'Upload a valid .csv or .xlsx spreadsheet file.',
    });
    return { success: false, rows: [], errors, totalRowCount: 0 };
  }

  // 3. Parse Raw Matrix
  let rawMatrix: string[][];
  try {
    if (isCsv) {
      rawMatrix = await parseCsvToMatrix(file);
    } else {
      rawMatrix = await parseXlsxToMatrix(file);
    }
  } catch (err) {
    errors.push({
      rowNumber: 1,
      field: 'file',
      code: 'ERR_INVALID_FILE_TYPE',
      severity: 'error',
      message: err instanceof Error ? err.message : 'Unable to parse spreadsheet file.',
    });
    return { success: false, rows: [], errors, totalRowCount: 0 };
  }

  if (!rawMatrix || rawMatrix.length === 0) {
    errors.push({
      rowNumber: 1,
      field: 'header',
      code: 'ERR_MISSING_HEADER',
      severity: 'error',
      message: 'Spreadsheet is empty. No header or question rows found.',
    });
    return { success: false, rows: [], errors, totalRowCount: 0 };
  }

  // 4. Header Row Analysis (Row 0 in matrix, Line 1 in spreadsheet)
  const headerRow = rawMatrix[0];
  const columnMapping: Partial<Record<CanonicalHeader, number>> = {};
  const seenCanonicalHeaders = new Set<CanonicalHeader>();

  for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
    const rawHeader = headerRow[colIdx]?.trim() || '';
    if (!rawHeader) continue; // Skip trailing empty header columns

    const normalizedKey = normalizeHeaderKey(rawHeader);

    // Check for forbidden database/server-managed columns
    if (FORBIDDEN_HEADERS.includes(normalizedKey)) {
      errors.push({
        rowNumber: 1,
        field: rawHeader,
        code: 'ERR_FORBIDDEN_HEADER',
        severity: 'error',
        message: `Column "${rawHeader}" is a database-managed property and must not be included in import spreadsheets.`,
        suggestedCorrection: `Remove the "${rawHeader}" column from the spreadsheet.`,
      });
      continue;
    }

    // Check alias mapping
    const canonical = HEADER_ALIASES[normalizedKey];
    if (!canonical) {
      errors.push({
        rowNumber: 1,
        field: rawHeader,
        code: 'ERR_UNKNOWN_HEADER',
        severity: 'error',
        message: `Unrecognized column header "${rawHeader}".`,
        suggestedCorrection: `Use one of the recognized canonical headers: ${CANONICAL_HEADERS.join(', ')}`,
      });
      continue;
    }

    if (seenCanonicalHeaders.has(canonical)) {
      errors.push({
        rowNumber: 1,
        field: rawHeader,
        code: 'ERR_UNKNOWN_HEADER',
        severity: 'error',
        message: `Duplicate column mapping for "${canonical}" (found header "${rawHeader}").`,
      });
      continue;
    }

    seenCanonicalHeaders.add(canonical);
    columnMapping[canonical] = colIdx;
  }

  // 5. Verify All Required Headers Are Present
  for (const req of REQUIRED_HEADERS) {
    if (columnMapping[req] === undefined) {
      errors.push({
        rowNumber: 1,
        field: req,
        code: 'ERR_MISSING_HEADER',
        severity: 'error',
        message: `Required column "${req}" is missing from spreadsheet header row.`,
        suggestedCorrection: `Add the "${req}" column to row 1.`,
      });
    }
  }

  // If header errors exist, abort before processing data rows
  if (errors.length > 0) {
    return { success: false, rows: [], errors, totalRowCount: 0 };
  }

  // 6. Process Data Rows (Lines 2..N in spreadsheet)
  const rows: ImportRow[] = [];
  let dataRowCount = 0;

  for (let i = 1; i < rawMatrix.length; i++) {
    const rawRow = rawMatrix[i];
    if (isRowBlank(rawRow)) {
      continue; // Skip entirely blank row without error
    }

    dataRowCount++;

    // Enforce 250 data rows limit
    if (dataRowCount > MAX_IMPORT_DATA_ROWS) {
      errors.push({
        rowNumber: i + 1,
        field: 'file',
        code: 'ERR_TOO_MANY_ROWS',
        severity: 'error',
        message: `File exceeds the maximum limit of ${MAX_IMPORT_DATA_ROWS} questions. Stopped reading at row ${i + 1}.`,
        suggestedCorrection: `Limit import to ${MAX_IMPORT_DATA_ROWS} questions per file.`,
      });
      break;
    }

    const questionText = getCellString(rawRow, columnMapping.question_text);
    const optionA = getCellString(rawRow, columnMapping.option_a);
    const optionB = getCellString(rawRow, columnMapping.option_b);
    const optionC = getCellString(rawRow, columnMapping.option_c);
    const optionD = getCellString(rawRow, columnMapping.option_d);
    const rawCorrect = getCellString(rawRow, columnMapping.correct_option);
    const category = getCellString(rawRow, columnMapping.category);

    // Optional fields with Q3 canonical defaults
    const rawDifficulty = getCellString(rawRow, columnMapping.difficulty).toLowerCase();
    const difficulty: QuestionBankDifficulty =
      rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard'
        ? (rawDifficulty as QuestionBankDifficulty)
        : 'medium';

    const rawMarksStr = getCellString(rawRow, columnMapping.marks);
    const parsedMarks = rawMarksStr ? parseInt(rawMarksStr, 10) : 1;
    const marks = Number.isInteger(parsedMarks) && parsedMarks > 0 ? parsedMarks : 1;

    const explanation = getCellString(rawRow, columnMapping.explanation) || '';

    const rawStatus = getCellString(rawRow, columnMapping.status).toLowerCase();
    const status: ImportQuestionStatus =
      rawStatus === 'published' || rawStatus === 'under_review' ? (rawStatus as ImportQuestionStatus) : 'draft';

    const rawSource = getCellString(rawRow, columnMapping.source_type).toLowerCase();
    const sourceType: QuestionBankSourceType =
      rawSource === 'official_exam' ||
      rawSource === 'textbook' ||
      rawSource === 'curriculum' ||
      rawSource === 'ai_assisted' ||
      rawSource === 'original'
        ? (rawSource as QuestionBankSourceType)
        : 'curriculum';

    const rawLanguage = getCellString(rawRow, columnMapping.language).toLowerCase();
    const language = rawLanguage || 'en';

    // Optional taxonomy fields (null/undefined when omitted)
    const subject = getCellString(rawRow, columnMapping.subject) || undefined;
    const topic = getCellString(rawRow, columnMapping.topic) || undefined;
    const examType = getCellString(rawRow, columnMapping.exam_type) || undefined;
    const examName = getCellString(rawRow, columnMapping.exam_name) || undefined;
    const rawExamYear = getCellString(rawRow, columnMapping.exam_year);
    const examYear = rawExamYear ? parseInt(rawExamYear, 10) : undefined;
    const sourceReference = getCellString(rawRow, columnMapping.source_reference) || undefined;

    const rowObj: ImportRow = {
      rowNumber: i + 1, // 1-based spreadsheet row index
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption: normalizeCorrectOption(rawCorrect),
      explanation,
      category,
      difficulty,
      marks,
      subject,
      topic,
      examType,
      examName,
      examYear: Number.isNaN(examYear) ? undefined : examYear,
      sourceType,
      sourceReference,
      language,
      status,
    };

    rows.push(rowObj);
  }

  return {
    success: errors.length === 0,
    rows,
    errors,
    totalRowCount: rows.length,
  };
}
