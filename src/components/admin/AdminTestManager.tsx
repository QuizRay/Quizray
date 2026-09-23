import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { QuizTest, AdminTestFormData } from '../../types/quiz';
import type { Category, DifficultyLevel } from '../../types';

export const AdminTestManager: React.FC = () => {
  const [tests, setTests] = useState<QuizTest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingTest, setDeletingTest] = useState<QuizTest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<AdminTestFormData>({
    categoryId: '',
    title: '',
    slug: '',
    description: '',
    durationMinutes: 15,
    difficulty: 'Intermediate',
    totalMarks: 50,
    isPublished: true,
  });

  const loadData = useCallback(async () => {
    try {
      const [testData, catData] = await Promise.all([
        quizService.getAllTests(),
        quizService.getCategories(),
      ]);
      setTests(testData);
      setCategories(catData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingTestId(null);
    setFormData({
      categoryId: categories[0]?.id || '',
      title: '',
      slug: '',
      description: '',
      durationMinutes: 15,
      difficulty: 'Intermediate',
      totalMarks: 50,
      isPublished: true,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (test: QuizTest) => {
    setEditingTestId(test.id);
    setFormData({
      categoryId: test.categoryId,
      title: test.title,
      slug: test.slug,
      description: test.description,
      durationMinutes: test.durationMinutes,
      difficulty: test.difficulty,
      totalMarks: test.totalMarks,
      isPublished: test.isPublished !== false,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setFormData((prev) => {
      // Auto-generate slug if it was empty or matched previous auto-slug
      const generatedSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return {
        ...prev,
        title: newTitle,
        slug: editingTestId ? prev.slug : generatedSlug,
      };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('URL Slug is required.');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Please select a category.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTestId) {
        await quizService.updateTest(editingTestId, formData);
      } else {
        await quizService.createTest(formData);
      }
      setIsFormModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save test.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (test: QuizTest) => {
    try {
      await quizService.updateTest(test.id, { isPublished: !test.isPublished });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update publish state');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTest) return;
    setIsSubmitting(true);
    try {
      await quizService.deleteTest(deletingTest.id);
      setIsDeleteModalOpen(false);
      setDeletingTest(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete test.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading test assessments..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          void loadData();
        }}
      />
    );
  }

  const filteredTests = tests.filter((t) => {
    const matchesCategory = filterCategory === 'all' || t.categoryId === filterCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
              Practice Test Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create, configure, publish, and schedule student assessments across knowledge domains.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Test</span>
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests by title or description..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="all">All Categories ({tests.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tests Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Assessment Title & Slug</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Difficulty</th>
                <th className="py-3.5 px-4">Duration & Marks</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTests.length > 0 ? (
                filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#0B132B]">{test.title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{test.slug}</div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] border border-blue-100">
                        {test.categoryName}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <Badge variant="difficulty" difficulty={test.difficulty} size="sm">
                        {test.difficulty as DifficultyLevel}
                      </Badge>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-xs text-slate-700 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{test.durationMinutes} mins</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {test.totalMarks} Marks • {test.questions.length} Qs
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(test)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                          test.isPublished
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle publish status"
                      >
                        {test.isPublished ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(test)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Assessment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingTest(test);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Assessment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">No tests match your filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingTestId ? 'Edit Assessment' : 'Create New Assessment'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category Stream *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Test Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Computer Science Fundamentals - Practice Set 01"
              required
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="computer-science-fundamentals-01"
              required
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Comprehensive assessment covering computer hardware, software, networking, and memory architectures."
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 15 })
                }
                required
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    difficulty: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced',
                  })
                }
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Total Marks
              </label>
              <input
                type="number"
                min={1}
                value={formData.totalMarks}
                onChange={(e) =>
                  setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 50 })
                }
                required
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="rounded text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Publish immediately for students
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingTestId ? 'Update Test' : 'Create Test'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Practice Test?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-[#0B132B] font-semibold">{deletingTest?.title}</strong>?
            This will remove all associated questions and student submissions.
          </p>

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
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
            >
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
