import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Archive,
  AlertCircle,
  FileQuestion,
  Sparkles,
  Search,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  ExternalLink,
  RotateCcw,
  BookOpen,
  Upload,
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AdminQuestionImportModal } from './AdminQuestionImportModal';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { Category } from '../../types';
import type {
  QuestionBankFilters,
  QuestionBankListResponse,
  QuestionBankDetail,
  QuestionBankSaveInput,
  QuestionBankStatus,
  QuestionBankDifficulty,
  QuestionBankSourceType,
} from '../../types/quiz';

const DIFFICULTY_CONFIG: Record<
  QuestionBankDifficulty,
  { label: string; badgeClass: string }
> = {
  easy: {
    label: 'Easy',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  hard: {
    label: 'Hard',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const STATUS_CONFIG: Record<
  QuestionBankStatus,
  { label: string; badgeClass: string }
> = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  published: {
    label: 'Published',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-300',
  },
};

const SOURCE_TYPE_LABELS: Record<QuestionBankSourceType, string> = {
  curriculum: 'Curriculum',
  official_exam: 'Official Exam',
  textbook: 'Textbook',
  ai_assisted: 'AI-Assisted',
  original: 'Original',
};

export const AdminQuestionManager: React.FC = () => {
  // ----------------------------------------------------------------------------
  // Filter & Pagination State
  // ----------------------------------------------------------------------------
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const [filters, setFilters] = useState<QuestionBankFilters>({
    search: '',
    categoryId: 'all',
    status: 'all',
    difficulty: 'all',
    subject: 'all',
    topic: 'all',
    examType: 'all',
    sourceType: 'all',
    language: 'all',
    page: 1,
    pageSize: 20,
  });

  // ----------------------------------------------------------------------------
  // Question Bank List Data State
  // ----------------------------------------------------------------------------
  const [listResponse, setListResponse] = useState<QuestionBankListResponse>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // ----------------------------------------------------------------------------
  // Detail Modal State
  // ----------------------------------------------------------------------------
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [selectedDetail, setSelectedDetail] = useState<QuestionBankDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ----------------------------------------------------------------------------
  // Create / Edit Form State
  // ----------------------------------------------------------------------------
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuestionBankSaveInput>({
    categoryId: '',
    questionText: '',
    difficulty: 'medium',
    marks: 1,
    correctOptionId: 'A',
    explanation: '',
    options: [
      { optionKey: 'A', optionText: '' },
      { optionKey: 'B', optionText: '' },
      { optionKey: 'C', optionText: '' },
      { optionKey: 'D', optionText: '' },
    ],
    status: 'draft',
    subject: '',
    topic: '',
    examType: '',
    examName: '',
    examYear: undefined,
    sourceType: 'curriculum',
    sourceReference: '',
    language: 'en',
    verificationNotes: '',
  });
  const [editingDetail, setEditingDetail] = useState<QuestionBankDetail | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ----------------------------------------------------------------------------
  // Delete Modal & Archive State
  // ----------------------------------------------------------------------------
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [questionToDelete, setQuestionToDelete] = useState<{ id: string; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // ----------------------------------------------------------------------------
  // Bulk Import Modal State
  // ----------------------------------------------------------------------------
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // ----------------------------------------------------------------------------
  // Load Active Categories
  // ----------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    quizService
      .getCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // ----------------------------------------------------------------------------
  // Debounce Search Input (~300ms)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      const normalized = trimmed.length >= 2 ? trimmed : '';
      setFilters((prev) => {
        if (prev.search === normalized) return prev;
        return { ...prev, search: normalized, page: 1 };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ----------------------------------------------------------------------------
  // Load Question Bank Data
  // ----------------------------------------------------------------------------
  const loadQuestionBank = useCallback(async (currentFilters: QuestionBankFilters) => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const response = await quizService.getAdminQuestionBank(currentFilters);
      setListResponse(response);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to fetch question bank.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadQuestionBank(filters);
  }, [filters, loadQuestionBank]);

  // ----------------------------------------------------------------------------
  // Handlers: Detail View
  // ----------------------------------------------------------------------------
  const handleOpenDetail = async (questionId: string) => {
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setDetailError(null);
    setSelectedDetail(null);
    try {
      const detail = await quizService.getAdminQuestionBankItem(questionId);
      setSelectedDetail(detail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load question details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Handlers: Create Form
  // ----------------------------------------------------------------------------
  const handleOpenCreate = () => {
    setEditingQuestionId(null);
    setEditingDetail(null);
    setFormData({
      categoryId: categories.find((c) => c.isActive)?.id || (categories[0]?.id ?? ''),
      questionText: '',
      difficulty: 'medium',
      marks: 1,
      correctOptionId: 'A',
      explanation: '',
      options: [
        { optionKey: 'A', optionText: '' },
        { optionKey: 'B', optionText: '' },
        { optionKey: 'C', optionText: '' },
        { optionKey: 'D', optionText: '' },
      ],
      status: 'draft',
      subject: '',
      topic: '',
      examType: '',
      examName: '',
      examYear: undefined,
      sourceType: 'curriculum',
      sourceReference: '',
      language: 'en',
      verificationNotes: '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // ----------------------------------------------------------------------------
  // Handlers: Edit Form (from List or Detail)
  // ----------------------------------------------------------------------------
  const handleOpenEdit = async (questionId: string) => {
    setFormError(null);
    setEditingQuestionId(questionId);
    try {
      let detail = selectedDetail;
      if (!detail || detail.id !== questionId) {
        detail = await quizService.getAdminQuestionBankItem(questionId);
      }
      setEditingDetail(detail);

      setFormData({
        questionId: detail.id,
        categoryId: detail.categoryId,
        questionText: detail.questionText,
        difficulty: detail.difficulty,
        marks: detail.marks,
        correctOptionId: detail.correctOptionId,
        explanation: detail.explanation,
        options: [
          { optionKey: 'A', optionText: detail.options.find((o) => o.optionKey === 'A')?.optionText || '' },
          { optionKey: 'B', optionText: detail.options.find((o) => o.optionKey === 'B')?.optionText || '' },
          { optionKey: 'C', optionText: detail.options.find((o) => o.optionKey === 'C')?.optionText || '' },
          { optionKey: 'D', optionText: detail.options.find((o) => o.optionKey === 'D')?.optionText || '' },
        ],
        status: detail.status,
        subject: detail.subject || '',
        topic: detail.topic || '',
        examType: detail.examType || '',
        examName: detail.examName || '',
        examYear: detail.examYear || undefined,
        sourceType: detail.sourceType,
        sourceReference: detail.sourceReference || '',
        language: detail.language || 'en',
        verificationNotes: detail.verificationNotes || '',
      });

      setIsDetailModalOpen(false);
      setIsFormModalOpen(true);
    } catch (err) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Failed to prepare question editor.');
      setTimeout(() => setActionErrorMessage(null), 6000);
    }
  };

  // ----------------------------------------------------------------------------
  // Handlers: Save Form Submit
  // ----------------------------------------------------------------------------
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client validation
    if (!formData.categoryId) {
      setFormError('Target Category is required.');
      return;
    }
    if (!formData.questionText.trim() || formData.questionText.trim().length < 10) {
      setFormError('Question text must be at least 10 characters long.');
      return;
    }
    if (!['easy', 'medium', 'hard'].includes(formData.difficulty)) {
      setFormError('Difficulty must be Easy, Medium, or Hard.');
      return;
    }
    if (!formData.marks || formData.marks < 1) {
      setFormError('Marks must be at least 1.');
      return;
    }
    if (!['A', 'B', 'C', 'D'].includes(formData.correctOptionId)) {
      setFormError('Please select a valid correct answer key (A, B, C, or D).');
      return;
    }
    for (const opt of formData.options) {
      if (!opt.optionText.trim()) {
        setFormError(`Option ${opt.optionKey} text cannot be empty.`);
        return;
      }
    }
    if (formData.status === 'published' && !formData.explanation?.trim()) {
      setFormError('Detailed answer explanation is required when publishing a question.');
      return;
    }

    // Lifecycle validation guards
    const isCreating = !editingQuestionId;
    const isAiAssisted = formData.sourceType === 'ai_assisted';
    const hasPublishedLinkedTests = editingDetail?.linkedTests?.some((t) => t.isPublished) ?? false;
    const originalStatus = editingDetail?.status;

    if (isCreating && isAiAssisted && formData.status === 'published') {
      setFormError('AI-assisted questions must start as Draft or Under Review and undergo human verification before publication.');
      return;
    }
    if (isCreating && formData.status === 'archived') {
      setFormError('New questions cannot be created directly as Archived.');
      return;
    }
    if (editingDetail && originalStatus === 'published' && formData.status !== 'published' && hasPublishedLinkedTests) {
      setFormError('Cannot unpublish or demote question: It is currently linked to one or more published tests.');
      return;
    }
    if (editingDetail && originalStatus === 'archived' && (formData.status === 'published' || formData.status === 'under_review')) {
      setFormError('Archived questions must be restored to Draft first before being reviewed or published.');
      return;
    }

    setIsSaving(true);
    try {
      const savedDetail = await quizService.saveAdminQuestion(formData);
      setIsFormModalOpen(false);
      setActionSuccessMessage(
        editingQuestionId ? 'Question updated successfully!' : 'Question added to Question Bank!'
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);

      // Refresh list
      await loadQuestionBank(filters);

      // If updating, reopen detail modal with fresh data
      if (editingQuestionId) {
        setSelectedDetail(savedDetail);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save question.');
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Handlers: Archive
  // ----------------------------------------------------------------------------
  const handleArchive = async (questionId: string) => {
    setIsArchiving(true);
    setActionErrorMessage(null);
    try {
      const res = await quizService.archiveAdminQuestion(questionId);
      setActionSuccessMessage(res.message || 'Question archived successfully.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setIsDetailModalOpen(false);
      await loadQuestionBank(filters);
    } catch (err) {
      setActionErrorMessage(err instanceof Error ? err.message : 'Failed to archive question.');
      setTimeout(() => setActionErrorMessage(null), 6000);
    } finally {
      setIsArchiving(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Handlers: Delete
  // ----------------------------------------------------------------------------
  const handleOpenDelete = (q: { id: string; text: string }) => {
    setQuestionToDelete(q);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await quizService.deleteAdminQuestion(questionToDelete.id);
      setIsDeleteModalOpen(false);
      setQuestionToDelete(null);
      setIsDetailModalOpen(false);
      setActionSuccessMessage(res.message || 'Question permanently deleted.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
      await loadQuestionBank(filters);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete question.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Reset All Filters
  // ----------------------------------------------------------------------------
  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      categoryId: 'all',
      status: 'all',
      difficulty: 'all',
      subject: 'all',
      topic: 'all',
      examType: 'all',
      sourceType: 'all',
      language: 'all',
      page: 1,
      pageSize: 20,
    });
  };

  // ----------------------------------------------------------------------------
  // Bulk Import Handler
  // ----------------------------------------------------------------------------
  const handleImportSuccess = async (importedCount: number) => {
    setActionSuccessMessage(
      `Successfully imported ${importedCount} ${
        importedCount === 1 ? 'question' : 'questions'
      } into the Question Bank!`
    );
    setTimeout(() => setActionSuccessMessage(null), 5000);
    await loadQuestionBank(filters);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification Banner (Success) */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast Notification Banner (Error) */}
      {actionErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
              Question Bank
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {listResponse.totalCount} {listResponse.totalCount === 1 ? 'Question' : 'Questions'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Master repository of curriculum-aligned questions across all categories and assessments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsImportModalOpen(true)}
            className="shadow-xs hover:shadow-sm"
          >
            <Upload className="w-4 h-4 mr-1.5 text-blue-600" />
            <span>Bulk Import</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            className="shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Question</span>
          </Button>
        </div>
      </div>

      {/* Search & Filter Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Search Bar Row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by question text, subject, topic, exam name (min. 2 characters)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-slate-50/50 hover:bg-white transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs font-semibold shrink-0"
            title="Reset all search and filter predicates"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>Reset</span>
          </Button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}
              className="w-full py-1.5 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Difficulty
            </label>
            <select
              value={filters.difficulty}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  difficulty: e.target.value as QuestionBankFilters['difficulty'],
                  page: 1,
                })
              }
              className="w-full py-1.5 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as QuestionBankFilters['status'],
                  page: 1,
                })
              }
              className="w-full py-1.5 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Source Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Source
            </label>
            <select
              value={filters.sourceType}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  sourceType: e.target.value as QuestionBankFilters['sourceType'],
                  page: 1,
                })
              }
              className="w-full py-1.5 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value="all">All Sources</option>
              <option value="curriculum">Curriculum</option>
              <option value="official_exam">Official Exam</option>
              <option value="textbook">Textbook</option>
              <option value="ai_assisted">AI-Assisted</option>
              <option value="original">Original</option>
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value, page: 1 })}
              className="w-full py-1.5 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value="all">All Languages</option>
              <option value="en">English (en)</option>
              <option value="hi">Hindi (hi)</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Page Size
            </label>
            <select
              value={filters.pageSize}
              onChange={(e) =>
                setFilters({ ...filters, pageSize: parseInt(e.target.value) || 20, page: 1 })
              }
              className="w-full py-1.5 px-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      {isLoadingList ? (
        <LoadingState message="Loading question bank items..." />
      ) : listError ? (
        <ErrorState error={listError} onRetry={() => loadQuestionBank(filters)} />
      ) : listResponse.items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-xs">
          <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#0B132B]">No Questions Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            No questions matched your current search and filter criteria. Try resetting your filters or create a new question.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Add Question
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {listResponse.items.map((q) => {
            const diffConfig = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.medium;
            const statusConfig = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft;

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                onClick={() => handleOpenDetail(q.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Metadata Badges + Question Preview */}
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Badge Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Category Pill */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <span>{q.categoryName}</span>
                      </span>

                      {/* Difficulty Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${diffConfig.badgeClass}`}
                      >
                        {diffConfig.label}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusConfig.badgeClass}`}
                      >
                        {statusConfig.label}
                      </span>

                      {/* Marks Badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                        {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                      </span>

                      {/* Source Type Badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-50 text-zinc-600 border border-zinc-200">
                        {SOURCE_TYPE_LABELS[q.sourceType] || q.sourceType}
                      </span>

                      {/* Verified Badge */}
                      {q.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    {/* Question Preview (SAFE: zero answer key or explanation shown) */}
                    <h3 className="text-sm font-semibold text-[#0B132B] group-hover:text-[#2563EB] transition-colors leading-relaxed line-clamp-2">
                      {q.questionText}
                    </h3>

                    {/* Secondary Attributes Row */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                      {q.subject && (
                        <span>
                          <strong className="text-slate-700">Subject:</strong> {q.subject}
                        </span>
                      )}
                      {q.topic && (
                        <span>
                          <strong className="text-slate-700">Topic:</strong> {q.topic}
                        </span>
                      )}
                      {q.examName && (
                        <span>
                          <strong className="text-slate-700">Exam:</strong> {q.examName}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{q.optionsCount} Options</span>
                      </span>
                      <span
                        className={`font-medium ${
                          q.linkedTestsCount > 0 ? 'text-blue-700' : 'text-slate-400'
                        }`}
                      >
                        {q.linkedTestsCount > 0
                          ? `Linked to ${q.linkedTestsCount} ${
                              q.linkedTestsCount === 1 ? 'Test' : 'Tests'
                            }`
                          : 'Unlinked'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div
                    className="flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(q.id)}
                      className="text-xs py-1.5 px-3"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      <span>View</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(q.id)}
                      className="text-xs py-1.5 px-3"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {listResponse.totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="text-xs text-slate-500">
            Showing{' '}
            <strong className="text-slate-800">
              {(listResponse.page - 1) * listResponse.pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800">
              {Math.min(listResponse.page * listResponse.pageSize, listResponse.totalCount)}
            </strong>{' '}
            of <strong className="text-slate-800">{listResponse.totalCount}</strong> questions
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={listResponse.page <= 1 || isLoadingList}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              className="text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              <span>Previous</span>
            </Button>

            <span className="text-xs font-bold text-slate-700 px-2">
              Page {listResponse.page} of {listResponse.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={listResponse.page >= listResponse.totalPages || isLoadingList}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              className="text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Detail Modal: View Full Question & Linked Tests */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Question Bank Item Detail"
        maxWidth="lg"
      >
        {isLoadingDetail ? (
          <LoadingState message="Fetching complete question payload..." />
        ) : detailError ? (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{detailError}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </div>
        ) : selectedDetail ? (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Metadata Pill Bar */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                {selectedDetail.categoryName}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                  DIFFICULTY_CONFIG[selectedDetail.difficulty]?.badgeClass
                }`}
              >
                {DIFFICULTY_CONFIG[selectedDetail.difficulty]?.label}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                  STATUS_CONFIG[selectedDetail.status]?.badgeClass
                }`}
              >
                {STATUS_CONFIG[selectedDetail.status]?.label}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                {selectedDetail.marks} {selectedDetail.marks === 1 ? 'Mark' : 'Marks'}
              </span>
              {selectedDetail.isVerified && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified</span>
                </span>
              )}
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Question Statement
              </label>
              <p className="text-sm font-bold text-[#0B132B] leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                {selectedDetail.questionText}
              </p>
            </div>

            {/* Options List (Strictly A -> B -> C -> D) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Options & Authoritative Answer Key
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedDetail.options.map((opt) => {
                  const isCorrect = opt.optionKey === selectedDetail.correctOptionId;
                  return (
                    <div
                      key={opt.optionKey}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        isCorrect
                          ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-400'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {opt.optionKey}
                        </span>
                        <span className="leading-snug">{opt.optionText}</span>
                      </div>
                      {isCorrect && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded shadow-2xs">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation Box */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Pedagogical Explanation
              </label>
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Explanation & Context</span>
                </div>
                <p>{selectedDetail.explanation || 'No explanation provided.'}</p>
              </div>
            </div>

            {/* Academic Classification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Subject</span>
                <span className="font-semibold text-slate-800">{selectedDetail.subject || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Topic</span>
                <span className="font-semibold text-slate-800">{selectedDetail.topic || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Source Type</span>
                <span className="font-semibold text-slate-800">
                  {SOURCE_TYPE_LABELS[selectedDetail.sourceType] || selectedDetail.sourceType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Exam Type</span>
                <span className="font-semibold text-slate-800">{selectedDetail.examType || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Exam Name</span>
                <span className="font-semibold text-slate-800">{selectedDetail.examName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Language</span>
                <span className="font-semibold text-slate-800">{selectedDetail.language || 'en'}</span>
              </div>
            </div>

            {/* Linked Assessments Section (Read-Only) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Linked Assessments ({selectedDetail.linkedTests.length})
              </label>
              {selectedDetail.linkedTests.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 italic text-center">
                  This question is not currently linked to any assessments. It is safe for isolated editing or deletion.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedDetail.linkedTests.map((t) => (
                    <div
                      key={t.testId}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{t.testTitle}</span>
                        <span className="text-[10px] text-slate-400">
                          (Question #{t.questionNumber}, {t.marks} {t.marks === 1 ? 'Mark' : 'Marks'})
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                          t.isPublished
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {t.isPublished ? 'Published Test' : 'Draft Test'}
                      </span>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    * Questions linked to published tests cannot be archived or demoted until unlinked from the test.
                  </p>
                </div>
              )}
            </div>

            {/* Detail Actions Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedDetail.status !== 'archived' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isArchiving}
                    onClick={() => handleArchive(selectedDetail.id)}
                    className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1" />
                    <span>{isArchiving ? 'Archiving...' : 'Archive'}</span>
                  </Button>
                )}

                {selectedDetail.status !== 'published' && selectedDetail.linkedTests.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenDelete({ id: selectedDetail.id, text: selectedDetail.questionText })
                    }
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenEdit(selectedDetail.id)}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  <span>Edit Question</span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Form Modal: Create & Edit Question */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingQuestionId ? 'Edit Question Bank Item' : 'Add Question to Question Bank'}
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Target Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="" disabled>
                Select Category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Question Statement * (min. 10 characters)
            </label>
            <textarea
              rows={3}
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              placeholder="e.g. Which layer of the OSI model is responsible for end-to-end communication and reliability?"
              required
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          {/* Core Classification: Difficulty, Marks, Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    difficulty: e.target.value as QuestionBankDifficulty,
                  })
                }
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Marks *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={formData.marks}
                onChange={(e) =>
                  setFormData({ ...formData, marks: parseInt(e.target.value) || 1 })
                }
                required
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as QuestionBankStatus,
                  })
                }
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              >
                <option
                  value="draft"
                  disabled={Boolean(editingDetail?.status === 'published' && editingDetail?.linkedTests?.some((t) => t.isPublished))}
                >
                  Draft{editingDetail?.status === 'published' && editingDetail?.linkedTests?.some((t) => t.isPublished) ? ' (Blocked: linked to published test)' : ''}
                </option>
                <option
                  value="under_review"
                  disabled={
                    Boolean(editingDetail?.status === 'published' && editingDetail?.linkedTests?.some((t) => t.isPublished)) ||
                    Boolean(editingDetail?.status === 'archived')
                  }
                >
                  Under Review{
                    editingDetail?.status === 'published' && editingDetail?.linkedTests?.some((t) => t.isPublished)
                      ? ' (Blocked: linked to published test)'
                      : editingDetail?.status === 'archived'
                      ? ' (Restore to Draft first)'
                      : ''
                  }
                </option>
                <option
                  value="published"
                  disabled={
                    Boolean(!editingQuestionId && formData.sourceType === 'ai_assisted') ||
                    Boolean(editingDetail?.status === 'archived')
                  }
                >
                  Published{
                    !editingQuestionId && formData.sourceType === 'ai_assisted'
                      ? ' (Requires verification after creation)'
                      : editingDetail?.status === 'archived'
                      ? ' (Restore to Draft first)'
                      : ''
                  }
                </option>
                <option
                  value="archived"
                  disabled={
                    Boolean(!editingQuestionId) ||
                    Boolean(editingDetail?.status === 'published' && editingDetail?.linkedTests?.some((t) => t.isPublished))
                  }
                >
                  Archived{
                    !editingQuestionId
                      ? ' (Cannot create directly as archived)'
                      : editingDetail?.status === 'published' && editingDetail?.linkedTests?.some((t) => t.isPublished)
                      ? ' (Blocked: linked to published test)'
                      : ''
                  }
                </option>
              </select>
            </div>
          </div>

          {/* Contextual Lifecycle & Invariant Callouts */}
          {!editingQuestionId && formData.sourceType === 'ai_assisted' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>AI-Assisted Policy:</strong> AI-generated questions must be created as <em>Draft</em> or <em>Under Review</em>. They require human administrator review and verification before publication.
              </span>
            </div>
          )}

          {editingDetail && editingDetail.status === 'published' && editingDetail.linkedTests?.some((t) => t.isPublished) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Protected Status:</strong> This question is currently linked to {editingDetail.linkedTests.filter((t) => t.isPublished).length} published test(s). It cannot be demoted to Draft, Under Review, or Archived until unlinked from all published tests.
              </span>
            </div>
          )}

          {editingDetail && editingDetail.status === 'archived' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Archived Lifecycle:</strong> To reactivate this question for use or editing, select <em>Draft</em> to begin the editorial pipeline.
              </span>
            </div>
          )}

          {editingDetail && formData.sourceType === 'ai_assisted' && formData.status === 'published' && !editingDetail.isVerified && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Administrator Verification:</strong> Saving this AI-assisted question as <em>Published</em> certifies that you have reviewed the content and records your verification.
              </span>
            </div>
          )}

          {/* 4 Options (Strictly A -> B -> C -> D) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              Multiple Choice Options * (Click letter or radio button to designate correct answer)
            </label>

            {(['A', 'B', 'C', 'D'] as const).map((key, index) => {
              const opt = formData.options[index] || { optionKey: key, optionText: '' };
              const isSelected = formData.correctOptionId === key;

              return (
                <div key={key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, correctOptionId: key })}
                    className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={`Mark option ${key} as correct answer`}
                  >
                    {key}
                  </button>
                  <input
                    type="text"
                    value={opt.optionText}
                    onChange={(e) => {
                      const newOptions = [...formData.options];
                      newOptions[index] = { optionKey: key, optionText: e.target.value };
                      setFormData({ ...formData, options: newOptions });
                    }}
                    placeholder={`Option ${key} text`}
                    required
                    className={`flex-1 py-2 px-3 text-sm rounded-xl border ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-200'
                    } focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]`}
                  />
                  <input
                    type="radio"
                    name="formCorrectOption"
                    checked={isSelected}
                    onChange={() => setFormData({ ...formData, correctOptionId: key })}
                    title="Mark as correct answer"
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Detailed Answer Explanation {formData.status === 'published' && '*'}
            </label>
            <textarea
              rows={3}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Explain why the designated option is correct, providing pedagogical context for student review."
              required={formData.status === 'published'}
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          {/* Taxonomic Attributes Accordion / Grid */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="block text-xs font-bold text-slate-700">
              Taxonomy & Source Metadata (Optional)
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Computer Networks"
                  className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  value={formData.topic || ''}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g. OSI Model"
                  className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Source Type
                </label>
                <select
                  value={formData.sourceType}
                  onChange={(e) => {
                    const newSource = e.target.value as QuestionBankSourceType;
                    const isCreating = !editingQuestionId;
                    const newStatus =
                      isCreating && newSource === 'ai_assisted' && formData.status === 'published'
                        ? 'draft'
                        : formData.status;
                    setFormData({
                      ...formData,
                      sourceType: newSource,
                      status: newStatus,
                    });
                  }}
                  className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                >
                  <option value="curriculum">Curriculum</option>
                  <option value="official_exam">Official Exam</option>
                  <option value="textbook">Textbook</option>
                  <option
                    value="ai_assisted"
                    disabled={Boolean(editingDetail?.status === 'published' && editingDetail?.sourceType !== 'ai_assisted')}
                  >
                    AI-Assisted{editingDetail?.status === 'published' && editingDetail?.sourceType !== 'ai_assisted' ? ' (Cannot convert published item)' : ''}
                  </option>
                  <option value="original">Original</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Exam Name
                </label>
                <input
                  type="text"
                  value={formData.examName || ''}
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                  placeholder="e.g. GATE CS"
                  className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Exam Year
                </label>
                <input
                  type="number"
                  min={1990}
                  max={2030}
                  value={formData.examYear || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, examYear: parseInt(e.target.value) || undefined })
                  }
                  placeholder="2024"
                  className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : editingQuestionId
                ? 'Update Question'
                : 'Add Question'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Delete Confirmation Modal */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Permanently Delete Question?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to delete this question? This question must have{' '}
            <strong className="text-slate-900">0 test links</strong> and{' '}
            <strong className="text-slate-900">0 historical student submissions</strong>. This action
            cannot be undone.
          </p>

          {questionToDelete && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 italic line-clamp-3">
              &ldquo;{questionToDelete.text}&rdquo;
            </div>
          )}

          {deleteError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Permanent Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. Bulk Question Import Modal */}
      <AdminQuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        categories={categories}
      />
    </div>
  );
};
