import { useEffect, useMemo, useRef, useState } from 'react';

import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '../lib/api';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import SearchInput from '../components/SearchInput';
import SelectField from '../components/SelectField';
import Card from '../components/Card';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import FormField from '../components/FormField';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import DataTable from '../components/DataTable';
import TableRowActions from '../components/TableRowActions';
import StatusBadge from '../components/StatusBadge';
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
  animationUrl?: string | null;
  Tag: TagItem[];
}

const statusOptions = ['PENDING', 'APPROVED', 'REJECTED'];
const LOTTIE_SCRIPT_ID = 'hangouthub-lottie-web';
const LOTTIE_SCRIPT_SRC =
  'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';

interface LottieInstance {
  destroy: () => void;
}

interface LottieLoader {
  loadAnimation: (config: {
    container: Element;
    renderer: 'svg' | 'canvas' | 'html';
    loop: boolean;
    autoplay: boolean;
    path?: string;
    animationData?: unknown;
  }) => LottieInstance;
}

interface LottieWindow extends Window {
  lottie?: LottieLoader;
}

let lottieScriptPromise: Promise<void> | null = null;

function ensureLottieScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if ((window as LottieWindow).lottie) {
    return Promise.resolve();
  }

  if (lottieScriptPromise) {
    return lottieScriptPromise;
  }

  lottieScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(LOTTIE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = LOTTIE_SCRIPT_ID;
    script.src = LOTTIE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Lottie script load failed'));
    document.body.appendChild(script);
  });

  return lottieScriptPromise;
}

function LottiePreview({
  animationUrl,
  animationData,
}: {
  animationUrl?: string | null;
  animationData?: unknown;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || (!animationData && !animationUrl)) {
      return;
    }

    let animation: LottieInstance | null = null;
    let cancelled = false;

    const boot = async () => {
      try {
        await ensureLottieScript();
        if (cancelled) {
          return;
        }
        const lottie = (window as LottieWindow).lottie;
        if (!lottie) {
          setPreviewError('Impossible de charger le moteur de previsualisation.');
          return;
        }
        container.innerHTML = '';
        if (animationData) {
          animation = lottie.loadAnimation({
            container,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData,
          });
        } else if (animationUrl) {
          animation = lottie.loadAnimation({
            container,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: animationUrl,
          });
        }
        setPreviewError('');
      } catch {
        setPreviewError('Apercu indisponible. Verifie la connexion internet.');
      }
    };

    void boot();

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [animationData, animationUrl]);

  if (!animationData && !animationUrl) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
        Aucun fichier a previsualiser.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div ref={containerRef} className="mx-auto h-28 w-28" />
      {previewError ? (
        <p className="mt-2 text-center text-xs text-rose-500">{previewError}</p>
      ) : null}
    </div>
  );
}

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
  const [animationFile, setAnimationFile] = useState<File | null>(null);
  const [animationBusy, setAnimationBusy] = useState(false);
  const [animationPreviewData, setAnimationPreviewData] = useState<unknown>(null);
  const [animationPreviewError, setAnimationPreviewError] = useState('');
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

  useEffect(() => {
    // Reset local preview state when switching category so the preview
    // always reflects the currently selected category animation.
    setAnimationFile(null);
    setAnimationPreviewData(null);
    setAnimationPreviewError('');
  }, [selectedCategoryId]);

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

  const handleAnimationFileChange = (file: File | null) => {
    setAnimationFile(file);
    setAnimationPreviewData(null);
    setAnimationPreviewError('');

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setAnimationPreviewData(parsed);
      } catch {
        setAnimationPreviewError('Le fichier JSON est invalide.');
      }
    };
    reader.onerror = () => {
      setAnimationPreviewError('Impossible de lire ce fichier.');
    };
    reader.readAsText(file);
  };

  const handleUploadAnimation = async () => {
    if (!selectedCategory || !animationFile) {
      return;
    }
    setAnimationBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', animationFile);
      await apiUpload(`/categories/${selectedCategory.id}/animation`, formData, 'POST');
      setAnimationFile(null);
      await load();
    } finally {
      setAnimationBusy(false);
    }
  };

  const handleRemoveAnimation = async () => {
    if (!selectedCategory || !selectedCategory.animationUrl) {
      return;
    }
    setAnimationBusy(true);
    try {
      await apiDelete(`/categories/${selectedCategory.id}/animation`);
      setAnimationFile(null);
      await load();
    } finally {
      setAnimationBusy(false);
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
      <PageHeader
        eyebrow="Taxonomie"
        title="Categories & tags"
        subtitle="Cree, edite et valide les tags proposes."
        actions={
          <FilterBar>
            <SearchInput
              value={searchTag}
              onChange={setSearchTag}
              placeholder="Rechercher un tag..."
            />
            <SelectField
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { label: 'Tous les statuts', value: 'all' },
                ...statusOptions.map((status) => ({
                  label: status,
                  value: status,
                })),
              ]}
            />
          </FilterBar>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <SectionCard>
            <SectionTitle label="Categories" subtitle="Choisis une categorie." />
            <div className="mt-4 space-y-2">
              {loading ? (
                <LoadingState />
              ) : loadError ? (
                <p className="text-sm text-rose-500">{loadError}</p>
              ) : categories.length === 0 ? (
                <EmptyState title="Aucune categorie." />
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold sm:px-4 ${
                      selectedCategoryId === category.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 truncate">{category.name}</span>
                    <span className="shrink-0 text-xs opacity-70">
                      {category.Tag.length} tags
                    </span>
                  </button>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle
              label="Nouvelle categorie"
              subtitle="Ajoute une categorie et sa couleur."
            />
            <div className="mt-4 space-y-3">
              <FormField label="Nom">
                <input
                  value={newCategory.name}
                  onChange={(event) =>
                    setNewCategory((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Nom"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </FormField>
              <FormField label="Couleur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="color"
                    value={newCategory.color || '#FF5C8A'}
                    onChange={(event) =>
                      setNewCategory((prev) => ({
                        ...prev,
                        color: event.target.value,
                      }))
                    }
                    className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1 sm:w-12"
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
              </FormField>
              <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
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
              <FormField label="Icone">
                <input
                  value={newCategory.icon}
                  onChange={(event) =>
                    setNewCategory((prev) => ({ ...prev, icon: event.target.value }))
                  }
                  placeholder="Icone (ex: sparkles)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </FormField>
              <button
                onClick={handleCreateCategory}
                disabled={saving}
                className="btn-primary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Ajouter la categorie
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="min-w-0 space-y-6">
          <SectionCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <SectionTitle
                label="Edition"
                subtitle="Mets a jour la categorie et ses tags."
              />
              <button
                onClick={handleUpdateCategory}
                disabled={saving || !selectedCategory}
                className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Enregistrer
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FormField label="Nom">
                <input
                  value={categoryDraft.name}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Nom"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </FormField>
              <FormField label="Couleur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="color"
                  value={categoryDraft.color || '#FF5C8A'}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      color: event.target.value,
                    }))
                  }
                    className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1 sm:w-12"
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
              </FormField>
              <FormField label="Icone">
                <input
                  value={categoryDraft.icon}
                  onChange={(event) =>
                    setCategoryDraft((prev) => ({
                      ...prev,
                      icon: event.target.value,
                    }))
                  }
                  placeholder="Icone"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </FormField>
              <div className="grid grid-cols-4 gap-2 md:col-span-3 md:flex md:flex-wrap">
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
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Animation Lottie
                  </p>
                  <p className="text-xs text-slate-500">
                    Fichier JSON (max 1 MB) pour animer la categorie dans l'app.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  {selectedCategory?.animationUrl ? 'Active' : 'Aucune'}
                </span>
              </div>

              {selectedCategory?.animationUrl ? (
                <a
                  href={selectedCategory.animationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block truncate text-xs font-medium text-indigo-600 hover:underline"
                >
                  Voir le fichier actuel
                </a>
              ) : null}

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) =>
                    handleAnimationFileChange(event.target.files?.[0] ?? null)
                  }
                  className="w-full max-w-full min-w-0 overflow-hidden text-sm text-slate-700 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-50 sm:w-auto"
                />
                <button
                  type="button"
                  onClick={handleUploadAnimation}
                  disabled={
                    !selectedCategory ||
                    !animationFile ||
                    animationBusy ||
                    !!animationPreviewError
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {animationBusy ? 'Upload...' : 'Uploader'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAnimation}
                  disabled={!selectedCategory?.animationUrl || animationBusy}
                  className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  Supprimer
                </button>
              </div>
              {animationPreviewError ? (
                <p className="mt-2 text-xs font-semibold text-rose-500">
                  {animationPreviewError}
                </p>
              ) : null}
              {animationFile ? (
                <p className="mt-2 text-xs text-slate-500">
                  Fichier selectionne: {animationFile.name}
                </p>
              ) : null}
              <div className="mt-3">
                <LottiePreview
                  animationData={animationPreviewData}
                  animationUrl={
                    animationPreviewData ? null : selectedCategory?.animationUrl
                  }
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <FormField label="Ajouter un tag">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <input
                    value={newTag}
                    onChange={(event) => setNewTag(event.target.value)}
                    placeholder="Ajouter un tag..."
                    className="w-full flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={saving || !selectedCategory}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Ajouter
                  </button>
                </div>
              </FormField>
            </div>
          </SectionCard>

          <Card>
            {loading ? (
              <LoadingState />
            ) : loadError ? (
              <p className="text-sm text-rose-500">{loadError}</p>
            ) : (
              <>
                <DataTable
                  columns={[
                    { label: 'Tag' },
                    { label: 'Statut' },
                    { label: 'Propose par' },
                    { label: 'Actions', className: 'text-right' },
                  ]}
                >
                  <tbody className="text-slate-700">
                    {pagedTags.map((tag) => (
                      <tr key={tag.id} className="border-t border-slate-100">
                        <td className="py-4 font-semibold">{tag.name}</td>
                        <td className="py-4">
                          <StatusBadge status={tag.status} />
                        </td>
                        <td className="py-4 text-xs text-slate-400">
                          {tag.submittedByUserId || 'Systeme'}
                        </td>
                        <td className="py-4 text-right">
                          <TableRowActions>
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
                          </TableRowActions>
                        </td>
                      </tr>
                    ))}
                    {visibleTags.length === 0 ? (
                      <tr>
                        <td colSpan={4}>
                          <EmptyState title="Aucun tag a afficher." />
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </DataTable>
                <Pagination
                  currentPage={page}
                  pageSize={pageSize}
                  totalItems={visibleTags.length}
                  onPageChange={setPage}
                />
              </>
            )}
          </Card>

          {selectedTagId ? (
            <SectionCard>
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <SectionTitle label="Tag selectionne" subtitle="Modifier ce tag." />
                <button
                  onClick={() => setSelectedTagId(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Fermer
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <FormField label="Nom du tag">
                  <input
                    value={tagDraft.name}
                    onChange={(event) =>
                      setTagDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Nom du tag"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  />
                </FormField>
                <FormField label="Statut">
                  <SelectField
                    value={tagDraft.status}
                    onChange={(value) =>
                      setTagDraft((prev) => ({ ...prev, status: value }))
                    }
                    options={statusOptions.map((status) => ({
                      label: status,
                      value: status,
                    }))}
                    className="w-full"
                  />
                </FormField>
                <FormField label="Categorie">
                  <SelectField
                    value={tagDraft.categoryId}
                    onChange={(value) =>
                      setTagDraft((prev) => ({
                        ...prev,
                        categoryId: Number(value),
                      }))
                    }
                    options={categories.map((category) => ({
                      label: category.name,
                      value: category.id,
                    }))}
                    className="w-full"
                  />
                </FormField>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleUpdateTag}
                  disabled={saving}
                  className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Enregistrer
                </button>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

