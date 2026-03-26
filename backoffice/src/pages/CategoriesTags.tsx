import React, { useEffect, useMemo, useState } from 'react';

import { apiGet, apiPatch, apiPost } from '../lib/api';
import Pagination from '../components/Pagination';

interface TagItem {
  id: number;
  name: string;
  status: string;
  submittedByUserId?: string | null;
}

interface CategoryItem {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
  Tag: TagItem[];
}

const statusOptions = ['PENDING', 'APPROVED', 'REJECTED'];

function normalizeStatus(status?: string | null) {
  return (status || 'PENDING').toUpperCase();
}

export default function CategoriesTagsPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '',
    icon: '',
  });
  const [categoryDraft, setCategoryDraft] = useState({
    name: '',
    color: '',
    icon: '',
  });
  const [newTag, setNewTag] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState({
    name: '',
    status: 'PENDING',
    categoryId: 0,
  });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const colorPresets = [
    '#FF5C8A',
    '#FF9F1C',
    '#2EC4B6',
    '#3A86FF',
    '#8338EC',
    '#22C55E',
    '#F97316',
    '#0F172A',
  ];

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiGet<CategoryItem[]>('/categories/admin');
      setCategories(data);
      if (data.length === 0) {
        setSelectedCategoryId(null);
        return;
      }
      setSelectedCategoryId((prev) =>
        prev && data.some((category) => category.id === prev)
          ? prev
          : data[0].id,
      );
    } catch {
      setLoadError('Impossible de charger les categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    if (selectedCategory) {
      setCategoryDraft({
        name: selectedCategory.name || '',
        color: selectedCategory.color || '',
        icon: selectedCategory.icon || '',
      });
    }
  }, [selectedCategory]);

  const allTags = useMemo(
    () =>
      categories.flatMap((category) =>
        category.Tag.map((tag) => ({
          ...tag,
          categoryId: category.id,
          categoryName: category.name,
        })),
      ),
    [categories],
  );

  const visibleTags = useMemo(() => {
    const query = searchTag.trim().toLowerCase();
    return allTags.filter((tag) => {
      if (selectedCategoryId && tag.categoryId !== selectedCategoryId) {
        return false;
      }
      if (statusFilter !== 'all' && normalizeStatus(tag.status) !== statusFilter) {
        return false;
      }
      if (query && !tag.name.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [allTags, searchTag, statusFilter, selectedCategoryId]);

  useEffect(() => {
    setPage(1);
  }, [searchTag, statusFilter, selectedCategoryId]);

  const pagedTags = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleTags.slice(start, start + pageSize);
  }, [visibleTags, page, pageSize]);

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      await apiPost('/categories', {
        name: newCategory.name,
        color: newCategory.color || undefined,
        icon: newCategory.icon || undefined,
      });
      setNewCategory({ name: '', color: '', icon: '' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) {
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/categories/${selectedCategory.id}`, {
        name: categoryDraft.name,
        color: categoryDraft.color || null,
        icon: categoryDraft.icon || null,
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!selectedCategory || !newTag.trim()) {
      return;
    }
    setSaving(true);
    try {
      await apiPost(`/categories/${selectedCategory.id}/tags`, {
        name: newTag,
      });
      setNewTag('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleSelectTag = (tagId: number) => {
    const tag = allTags.find((entry) => entry.id === tagId);
    if (!tag) {
      return;
    }
    setSelectedTagId(tagId);
    setTagDraft({
      name: tag.name,
      status: normalizeStatus(tag.status),
      categoryId: tag.categoryId,
    });
  };

  const handleUpdateTag = async () => {
    if (!selectedTagId) {
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/categories/tags/${selectedTagId}`, {
        name: tagDraft.name,
        status: tagDraft.status,
        categoryId: tagDraft.categoryId,
      });
      setSelectedTagId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (tagId: number, status: string) => {
    setSaving(true);
    try {
      await apiPatch(`/categories/tags/${tagId}`, { status });
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Taxonomie
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Categories & tags
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cree, edite et valide les tags proposes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={searchTag}
              onChange={(event) => setSearchTag(event.target.value)}
              placeholder="Rechercher un tag..."
              className="w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Categories
            </p>
            <div className="mt-4 space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Chargement...</p>
              ) : loadError ? (
                <p className="text-sm text-rose-500">{loadError}</p>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                      selectedCategoryId === category.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs opacity-70">
                      {category.Tag.length} tags
                    </span>
                  </button>
                ))
              )}
              {!loading && !loadError && categories.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune categorie.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Nouvelle categorie
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={newCategory.name}
                onChange={(event) =>
                  setNewCategory((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Nom"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              />
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newCategory.color || '#FF5C8A'}
                  onChange={(event) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      color: event.target.value,
                    }))
                  }
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <input
                  value={newCategory.color}
                  onChange={(event) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      color: event.target.value,
                    }))
                  }
                  placeholder="Couleur (#FF5C8A)"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      setNewCategory((prev) => ({ ...prev, color }))
                    }
                    className="h-8 w-8 rounded-full border border-white shadow-soft"
                    style={{ backgroundColor: color }}
                    aria-label={`Choisir ${color}`}
                  />
                ))}
              </div>
              <input
                value={newCategory.icon}
                onChange={(event) =>
                  setNewCategory((prev) => ({ ...prev, icon: event.target.value }))
                }
                placeholder="Icone (ex: sparkles)"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              />
              <button
                onClick={handleCreateCategory}
                disabled={saving}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Ajouter la categorie
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Edition
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {selectedCategory?.name || 'Categorie'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Mets a jour le style et les tags associes.
                </p>
              </div>
              <button
                onClick={handleUpdateCategory}
                disabled={saving || !selectedCategory}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Enregistrer
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Nom"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              />
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={categoryDraft.color || '#FF5C8A'}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      color: event.target.value,
                    }))
                  }
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <input
                  value={categoryDraft.color}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      color: event.target.value,
                    }))
                  }
                  placeholder="Couleur"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-3">
                {colorPresets.map((color) => (
                  <button
                    key={`edit-${color}`}
                    type="button"
                    onClick={() =>
                      setCategoryDraft((prev) => ({ ...prev, color }))
                    }
                    className="h-7 w-7 rounded-full border border-white shadow-soft"
                    style={{ backgroundColor: color }}
                    aria-label={`Choisir ${color}`}
                  />
                ))}
              </div>
              <input
                value={categoryDraft.icon}
                onChange={(event) =>
                  setCategoryDraft((prev) => ({ ...prev, icon: event.target.value }))
                }
                placeholder="Icone"
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  placeholder="Ajouter un tag..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
                <button
                  onClick={handleAddTag}
                  disabled={saving || !selectedCategory}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            {loading ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : loadError ? (
              <p className="text-sm text-rose-500">{loadError}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="pb-3">Tag</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3">Propose par</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {pagedTags.map((tag) => (
                      <tr key={tag.id} className="border-t border-slate-100">
                        <td className="py-4 font-semibold">{tag.name}</td>
                        <td className="py-4 text-xs font-semibold text-slate-500">
                          {normalizeStatus(tag.status)}
                        </td>
                        <td className="py-4 text-xs text-slate-400">
                          {tag.submittedByUserId || 'Systeme'}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => handleSelectTag(tag.id)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Editer
                            </button>
                            <button
                              onClick={() => handleQuickStatus(tag.id, 'APPROVED')}
                              disabled={saving}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => handleQuickStatus(tag.id, 'REJECTED')}
                              disabled={saving}
                              className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              Refuser
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleTags.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Aucun tag a afficher.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <Pagination
                  currentPage={page}
                  pageSize={pageSize}
                  totalItems={visibleTags.length}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>

          {selectedTagId ? (
            <div className="rounded-2xl bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Tag selectionne
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">
                    Modifier le tag
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTagId(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Fermer
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <input
                  value={tagDraft.name}
                  onChange={(event) =>
                    setTagDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Nom du tag"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
                <select
                  value={tagDraft.status}
                  onChange={(event) =>
                    setTagDraft((prev) => ({ ...prev, status: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={tagDraft.categoryId}
                  onChange={(event) =>
                    setTagDraft((prev) => ({
                      ...prev,
                      categoryId: Number(event.target.value),
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleUpdateTag}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
