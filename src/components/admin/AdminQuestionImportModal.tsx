import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Upload,
  FileUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Info,
  Check,
  ArrowRight,
  Database,
  Copy,
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { Button } from '../ui/Button';
import type { Category } from '../../types';
import type {
  ImportParsedRow,
  ImportPreviewSummary,
  ImportExecutionResult,
} from '../../types/quiz';

export interface AdminQuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  categories?: Category[];
}

type ModalTabFilter = 'all' | 'ready' | 'duplicates' | 'invalid' | 'warnings';

type ModalState =
  | 'idle'
  | 'parsing'
  | 'validating'
  | 'preview'
  | 'importing'
  | 'completed'
  | 'error';

export const AdminQuestionImportModal: React.FC<AdminQuestionImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  // Modal Lifecycle States
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed and Validated Data
  const [parsedRows, setParsedRows] = useState<ImportParsedRow[]>([]);
  const [summary, setSummary] = useState<ImportPreviewSummary | null>(null);

  // Preview Filters & UI State
  const [activeTab, setActiveTab] = useState<ModalTabFilter>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Execution & Progress State
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setModalState('idle');
      setSelectedFile(null);
      setErrorMessage(null);
      setParsedRows([]);
      setSummary(null);
      setActiveTab('all');
      setExpandedRows(new Set());
      setProgress({ current: 0, total: 0 });
      setExecutionResult(null);
    }
  }, [isOpen]);

  // Handle ESC key press (disabled during active import)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && modalState !== 'importing') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, modalState, onClose]);

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (modalState === 'importing') return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // Main Pipeline: Parse then Validate
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);

    // 1. Client-side format and size checks
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
      setErrorMessage(
        `Invalid file type ".${ext || 'unknown'}". Only .csv and .xlsx spreadsheets are supported.`
      );
      setModalState('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum limit of 5 MB.`
      );
      setModalState('error');
      return;
    }

    // 2. Parsing phase via existing quizService.parseQuestionImportFile
    setModalState('parsing');
    try {
      const parseResult = await quizService.parseQuestionImportFile(file);

      if (!parseResult.success) {
        const topError =
          parseResult.errors[0]?.message || 'Failed to parse file. Please verify spreadsheet structure.';
        setErrorMessage(topError);
        setModalState('error');
        return;
      }

      if (parseResult.rows.length === 0) {
        setErrorMessage('Spreadsheet contains 0 data rows. Please ensure your file has questions.');
        setModalState('error');
        return;
      }

      if (parseResult.rows.length > 250) {
        setErrorMessage(
          `File contains ${parseResult.rows.length} rows, which exceeds the maximum limit of 250 rows per batch.`
        );
        setModalState('error');
        return;
      }

      // 3. Validation phase via existing quizService.validateQuestionImport
      setModalState('validating');

      // Pass categories if provided to avoid duplicate fetching
      const validationResult = await quizService.validateQuestionImport(
        parseResult.rows,
        categories && categories.length > 0 ? categories : undefined
      );

      setParsedRows(validationResult.parsedRows);
      setSummary(validationResult.summary);
      setModalState('preview');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during import processing.'
      );
      setModalState('error');
    }
  };

  // Reset to select another file
  const handleReset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedFile(null);
    setErrorMessage(null);
    setParsedRows([]);
    setSummary(null);
    setActiveTab('all');
    setExpandedRows(new Set());
    setProgress({ current: 0, total: 0 });
    setExecutionResult(null);
    setModalState('idle');
  };

  // Toggle row expansion for full question text & options inspection
  const toggleRowExpansion = (rowNumber: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  // Filtered rows for the preview table
  const filteredRows = useMemo(() => {
    return parsedRows.filter((row) => {
      switch (activeTab) {
        case 'ready':
          return row.isValid && row.duplicateType === 'none';
        case 'duplicates':
          return row.duplicateType !== 'none';
        case 'invalid':
          return !row.isValid;
        case 'warnings':
          return row.warnings.length > 0;
        case 'all':
        default:
          return true;
      }
    });
  }, [parsedRows, activeTab]);

  // Approved rows strictly eligible for import
  const approvedRows = useMemo(() => {
    return parsedRows.filter(
      (r) => r.isValid && r.duplicateType === 'none' && Boolean(r.normalizedData)
    );
  }, [parsedRows]);

  // Import Execution
  const handleExecuteImport = async () => {
    if (approvedRows.length === 0 || modalState === 'importing') return;

    setModalState('importing');
    setProgress({ current: 0, total: approvedRows.length });

    try {
      const result = await quizService.bulkImportQuestions(approvedRows, (processed, total) => {
        setProgress({ current: processed, total });
      });

      setExecutionResult(result);
      setModalState('completed');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred during bulk question execution.'
      );
      setModalState('error');
    }
  };

  // Handle Finish
  const handleFinish = () => {
    const importedCount = executionResult?.importedCount || 0;
    onClose();
    if (importedCount > 0) {
      onSuccess(importedCount);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (modalState !== 'importing') onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 id="import-modal-title" className="text-lg font-bold text-[#0B132B]">
                Bulk Question Import
              </h2>
              <p className="text-xs text-slate-500">
                Import questions from CSV or XLSX spreadsheets directly into the Question Bank.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={modalState === 'importing'}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Idle / File Dropzone */}
          {modalState === 'idle' && (
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-10 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-[#2563EB] mx-auto flex items-center justify-center transition-colors mb-4">
                  <FileUp className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#0B132B] mb-1">
                  Click to browse or drag and drop spreadsheet
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Supports CSV, XLSX, and XLS formats (up to 5 MB or 250 questions)
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-xs">
                  <span>Maximum 250 rows per batch</span>
                </div>
              </div>

              {/* Format Hints & Requirements */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Required Spreadsheet Columns</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                    question_text *
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                    option_a *
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                    option_b *
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                    option_c *
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                    option_d *
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                    correct_option *
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-700">
                    category *
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-slate-500">
                    explanation
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Optional columns: <code className="text-slate-700">difficulty</code> (easy, medium, hard),{' '}
                  <code className="text-slate-700">marks</code> (1-20),{' '}
                  <code className="text-slate-700">status</code> (draft, under_review, published),{' '}
                  <code className="text-slate-700">source_type</code>,{' '}
                  <code className="text-slate-700">subject</code>, <code className="text-slate-700">topic</code>.
                  Database duplicates and invalid rows will be flagged and skipped by default.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2 & 3: Parsing / Validating Spinner */}
          {(modalState === 'parsing' || modalState === 'validating') && (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B132B]">
                  {modalState === 'parsing' ? 'Reading spreadsheet...' : 'Validating questions...'}
                </h3>
                <p className="text-xs text-slate-500">
                  {modalState === 'parsing'
                    ? 'Extracting rows and canonical columns'
                    : 'Resolving categories and analyzing duplicate content against Question Bank'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Error State */}
          {modalState === 'error' && (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-900">Import Validation Failed</h3>
                <p className="text-xs text-rose-700 max-w-lg mx-auto leading-relaxed">
                  {errorMessage || 'Failed to parse or validate spreadsheet.'}
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Choose Another File</span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Preview & Confirmation View */}
          {modalState === 'preview' && summary && (
            <div className="space-y-5">
              {/* File details bar */}
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">{selectedFile?.name}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    {((selectedFile?.size || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-lg font-black text-slate-800">{summary.totalRows}</div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <div className="text-lg font-black text-emerald-700">{summary.validRows}</div>
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Valid
                  </div>
                </div>

                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                  <div className="text-lg font-black text-rose-700">{summary.invalidRows}</div>
                  <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                    Invalid
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                  <div className="text-lg font-black text-amber-700">{summary.duplicateRows}</div>
                  <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                    Duplicates
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <div className="text-lg font-black text-blue-700">{summary.warningRows}</div>
                  <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                    Warnings
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200">
                  <div className="text-lg font-black text-indigo-700">{summary.readyToImport}</div>
                  <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                    Ready
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="text-lg font-black text-zinc-600">{summary.skippedRows}</div>
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Skipped
                  </div>
                </div>
              </div>

              {/* Informational Guidance Alert */}
              {summary.duplicateRows > 0 && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Duplicate Detection Active: </span>
                    {summary.duplicateRows} {summary.duplicateRows === 1 ? 'question is' : 'questions are'}{' '}
                    already present in the Question Bank or duplicated within this file. Duplicate rows are
                    skipped by default to prevent duplicate question creation.
                  </div>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ready')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'ready'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Ready to Import ({summary.readyToImport})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('duplicates')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'duplicates'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Duplicates ({summary.duplicateRows})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('invalid')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'invalid'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Invalid ({summary.invalidRows})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('warnings')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'warnings'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  Warnings ({summary.warningRows})
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Question</th>
                        <th className="py-2.5 px-3 w-28">Category</th>
                        <th className="py-2.5 px-3 w-20">Diff</th>
                        <th className="py-2.5 px-3 w-24">Validation</th>
                        <th className="py-2.5 px-3 w-28">Duplicates</th>
                        <th className="py-2.5 px-3 w-16 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No questions match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => {
                          const isExpanded = expandedRows.has(row.rowNumber);

                          return (
                            <React.Fragment key={row.rowNumber}>
                              <tr
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  !row.isValid
                                    ? 'bg-rose-50/20'
                                    : row.duplicateType !== 'none'
                                    ? 'bg-amber-50/20'
                                    : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                                  {row.rowNumber}
                                </td>

                                <td className="py-2.5 px-3">
                                  <div className="font-medium text-slate-800 line-clamp-1">
                                    {row.raw.questionText || (
                                      <span className="text-rose-500 italic">(Empty Question Text)</span>
                                    )}
                                  </div>
                                  {row.errors.length > 0 && (
                                    <div className="text-[11px] text-rose-600 font-semibold mt-0.5 line-clamp-1">
                                      {row.errors[0].message}
                                    </div>
                                  )}
                                  {row.warnings.length > 0 && row.errors.length === 0 && (
                                    <div className="text-[11px] text-amber-700 mt-0.5 line-clamp-1">
                                      {row.warnings[0].message}
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-slate-700 truncate">
                                  {row.resolvedCategoryName ? (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium truncate block max-w-[110px]">
                                      {row.resolvedCategoryName}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium truncate block max-w-[110px]">
                                      {row.raw.category || 'Missing'}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      row.raw.difficulty === 'hard'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : row.raw.difficulty === 'easy'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {row.raw.difficulty || 'medium'}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3">
                                  {row.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Valid</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span>Invalid</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  {row.duplicateType === 'none' ? (
                                    <span className="text-slate-400 text-[11px]">None</span>
                                  ) : row.duplicateType === 'in_database' ? (
                                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                                      <Database className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span>In Database</span>
                                    </span>
                                  ) : row.duplicateType === 'in_file' ? (
                                    <span className="inline-flex items-center gap-1 text-orange-700 font-semibold text-[11px]">
                                      <Copy className="w-3 h-3 text-orange-600 shrink-0" />
                                      <span>In File</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-purple-700 font-semibold text-[11px]">
                                      <Copy className="w-3 h-3 text-purple-600 shrink-0" />
                                      <span>Both</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpansion(row.rowNumber)}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                    aria-label="Inspect row details"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Row Inspection Drawer */}
                              {isExpanded && (
                                <tr className="bg-slate-50/90 text-xs">
                                  <td colSpan={7} className="p-4 border-b border-slate-200 space-y-3">
                                    <div>
                                      <div className="font-semibold text-slate-800 mb-1">
                                        Full Question:
                                      </div>
                                      <div className="text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200 font-serif text-[13px]">
                                        {row.raw.questionText}
                                      </div>
                                    </div>

                                    {/* 4 Options Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      <div
                                        className={`p-2 rounded-lg border ${
                                          row.raw.correctOption === 'A'
                                            ? 'bg-emerald-50/80 border-emerald-300 font-medium'
                                            : 'bg-white border-slate-200'
                                        }`}
                                      >
                                        <span className="font-bold mr-1.5">A:</span>
                                        {row.raw.optionA}
                                      </div>
                                      <div
                                        className={`p-2 rounded-lg border ${
                                          row.raw.correctOption === 'B'
                                            ? 'bg-emerald-50/80 border-emerald-300 font-medium'
                                            : 'bg-white border-slate-200'
                                        }`}
                                      >
                                        <span className="font-bold mr-1.5">B:</span>
                                        {row.raw.optionB}
                                      </div>
                                      <div
                                        className={`p-2 rounded-lg border ${
                                          row.raw.correctOption === 'C'
                                            ? 'bg-emerald-50/80 border-emerald-300 font-medium'
                                            : 'bg-white border-slate-200'
                                        }`}
                                      >
                                        <span className="font-bold mr-1.5">C:</span>
                                        {row.raw.optionC}
                                      </div>
                                      <div
                                        className={`p-2 rounded-lg border ${
                                          row.raw.correctOption === 'D'
                                            ? 'bg-emerald-50/80 border-emerald-300 font-medium'
                                            : 'bg-white border-slate-200'
                                        }`}
                                      >
                                        <span className="font-bold mr-1.5">D:</span>
                                        {row.raw.optionD}
                                      </div>
                                    </div>

                                    {row.raw.explanation && (
                                      <div className="text-xs">
                                        <span className="font-semibold text-slate-700">Explanation: </span>
                                        <span className="text-slate-600">{row.raw.explanation}</span>
                                      </div>
                                    )}

                                    {/* Issues Report */}
                                    {(row.errors.length > 0 || row.warnings.length > 0) && (
                                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                                        {row.errors.map((err, idx) => (
                                          <div
                                            key={`err-${idx}`}
                                            className="flex items-start gap-2 text-rose-700 text-xs"
                                          >
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                            <span>
                                              <strong>[{err.code}]</strong> {err.message}
                                              {err.suggestedCorrection && (
                                                <span className="text-slate-500 ml-1">
                                                  ({err.suggestedCorrection})
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        ))}
                                        {row.warnings.map((warn, idx) => (
                                          <div
                                            key={`warn-${idx}`}
                                            className="flex items-start gap-2 text-amber-700 text-xs"
                                          >
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                                            <span>
                                              <strong>[{warn.code}]</strong> {warn.message}
                                              {warn.suggestedCorrection && (
                                                <span className="text-slate-500 ml-1">
                                                  ({warn.suggestedCorrection})
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Active Importing State */}
          {modalState === 'importing' && (
            <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-5">
              <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0B132B]">
                  Importing Questions into Question Bank
                </h3>
                <p className="text-xs text-slate-500">
                  Sequential server-side insertion via Question Bank RPC. Please do not close this window.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="bg-[#2563EB] h-full transition-all duration-200 rounded-full"
                    style={{
                      width: `${
                        progress.total > 0
                          ? Math.round((progress.current / progress.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>
                    Importing {progress.current} of {progress.total} questions
                  </span>
                  <span>
                    {progress.total > 0
                      ? Math.round((progress.current / progress.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Completed Result State */}
          {modalState === 'completed' && executionResult && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0B132B]">Bulk Import Completed</h3>
                <p className="text-xs text-slate-500">
                  The selected question rows have been processed and stored in the Question Bank.
                </p>
              </div>

              {/* Result Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-2xl font-black text-emerald-700">
                    {executionResult.importedCount}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                    Imported
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="text-2xl font-black text-zinc-700">
                    {executionResult.skippedCount}
                  </div>
                  <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mt-0.5">
                    Skipped
                  </div>
                </div>

                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-2xl font-black text-rose-700">
                    {executionResult.failedCount}
                  </div>
                  <div className="text-xs font-bold text-rose-700 uppercase tracking-wider mt-0.5">
                    Failed
                  </div>
                </div>
              </div>

              {/* Server Failure Details if any */}
              {executionResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Failed Rows ({executionResult.errors.length})</span>
                  </div>
                  <div className="border border-rose-200 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-100 text-rose-900 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-16">Row #</th>
                          <th className="py-2 px-3 w-28">Code</th>
                          <th className="py-2 px-3">Server Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-rose-50/40">
                        {executionResult.errors.map((err, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-mono text-[11px] text-rose-800">
                              {err.rowNumber}
                            </td>
                            <td className="py-2 px-3 font-semibold text-rose-700">{err.code}</td>
                            <td className="py-2 px-3 text-rose-800">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div>
            {modalState === 'preview' && (
              <span className="text-xs text-slate-500">
                {approvedRows.length === 0 ? (
                  <span className="text-rose-600 font-medium">0 questions ready for import</span>
                ) : (
                  <span>
                    Ready to import <strong className="text-slate-800">{approvedRows.length}</strong> of{' '}
                    {parsedRows.length} questions
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {modalState === 'preview' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={approvedRows.length === 0}
                  className="shadow-sm hover:shadow-md"
                >
                  <ArrowRight className="w-4 h-4 mr-1.5" />
                  <span>
                    {approvedRows.length === 0
                      ? 'No Questions Ready to Import'
                      : `Import ${approvedRows.length} ${
                          approvedRows.length === 1 ? 'Question' : 'Questions'
                        }`}
                  </span>
                </Button>
              </>
            )}

            {modalState === 'completed' && (
              <Button type="button" variant="primary" size="sm" onClick={handleFinish}>
                <Check className="w-4 h-4 mr-1.5" />
                <span>Done</span>
              </Button>
            )}

            {(modalState === 'idle' || modalState === 'error') && (
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminQuestionImportModal;
