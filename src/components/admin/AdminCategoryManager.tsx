import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Laptop,
  Calculator,
  FlaskConical,
  Globe2,
  BrainCircuit,
  BookOpen,
  Landmark,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { Category } from '../../types';
import type { AdminCategoryFormData } from '../../types/quiz';

const categoryIconMap: Record<Category['iconName'], LucideIcon> = {
  computer: Laptop,
  math: Calculator,
  science: FlaskConical,
  gk: Globe2,
  reasoning: BrainCircuit,
  english: BookOpen,
  banking: Landmark,
  gov: ShieldCheck,
};

export const AdminCategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState<AdminCategoryFormData>({
    name: '',
    slug: '',
    description: '',
    iconName: 'computer',
    displayOrder: 1,
    isActive: true,
  });

  const loadCategories = useCallback(async () => {
    try {
      const data = await quizService.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpenCreateModal = () => {
    setEditingCategoryId(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      iconName: 'computer',
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug || cat.id,
      description: cat.description,
      iconName: cat.iconName,
      displayOrder: 1,
      isActive: true,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleNameChange = (newName: string) => {
    setFormData((prev) => {
      const generatedSlug = 'cat-' + newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return {
        ...prev,
        name: newName,
        slug: editingCategoryId ? prev.slug : generatedSlug,
      };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('Category slug is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategoryId) {
        await quizService.updateCategory(editingCategoryId, formData);
      } else {
        await quizService.createCategory(formData);
      }
      setIsFormModalOpen(false);
      await loadCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true);
    try {
      await quizService.deleteCategory(deletingCategory.id);
      setIsDeleteModalOpen(false);
      setDeletingCategory(null);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading curriculum categories..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          void loadCategories();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B132B] font-['Plus_Jakarta_Sans',sans-serif]">
              Curriculum Category Manager
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Configure subject knowledge streams, icons, display order, and active availability.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Category</span>
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Domain / Name</th>
                <th className="py-3.5 px-4">Identifier / Slug</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Tests Count</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {categories.map((cat) => {
                const IconComponent = categoryIconMap[cat.iconName] || Laptop;
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2563EB] flex items-center justify-center shrink-0">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[#0B132B]">{cat.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{cat.iconName} Stream</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-slate-600">
                      {cat.slug || cat.id}
                    </td>

                    <td className="py-4 px-4 max-w-xs text-xs text-slate-600 truncate">
                      {cat.description}
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        {cat.testCount} Tests
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingCategory(cat);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCategoryId ? 'Edit Category' : 'Create New Category'}
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
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Data Science & AI"
              required
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category Slug / Identifier *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="cat-data-science"
              required
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Icon Representation
            </label>
            <select
              value={formData.iconName}
              onChange={(e) =>
                setFormData({ ...formData, iconName: e.target.value as Category['iconName'] })
              }
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              <option value="computer">Computer & Tech (Laptop)</option>
              <option value="math">Mathematics (Calculator)</option>
              <option value="science">General Science (Flask)</option>
              <option value="gk">General Knowledge (Globe)</option>
              <option value="reasoning">Logical Reasoning (Brain)</option>
              <option value="english">Verbal & English (Book)</option>
              <option value="banking">Banking & Finance (Landmark)</option>
              <option value="gov">Civil & Governance (Shield)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Curated practice modules for mastering foundational and applied subject topics."
              className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min={1}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })
                }
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">Active Status</span>
              </label>
            </div>
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
              {isSubmitting
                ? 'Saving...'
                : editingCategoryId
                ? 'Update Category'
                : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Category?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <strong className="text-[#0B132B] font-semibold">{deletingCategory?.name}</strong>?
            Any tests in this category should first be reassigned or deleted.
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
