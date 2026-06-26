import { useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
} from '@/components/ui';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';
import type { TaxonomyCategory, TaxonomyTag } from './taxonomy.api';
import {
  useCreateCategory,
  useCreateTag,
  useTaxonomy,
  useUpdateCategory,
  useUpdateTag,
} from './useTaxonomy';

const STATUS_ORDER: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

export function TaxonomyPage() {
  useDocumentTitle('Taxonomie');
  const { data, isLoading, isError, refetch } = useTaxonomy();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [newCategory, setNewCategory] = useState('');

  const handleCreateCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    createCategory.mutate({ name }, { onSuccess: () => setNewCategory('') });
  };

  const handleRenameCategory = (category: TaxonomyCategory) => {
    const name = window.prompt('Nouveau nom de la catégorie :', category.name)?.trim();
    if (name && name !== category.name) {
      updateCategory.mutate({ id: category.id, payload: { name } });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories & Tags"
        description="Gérez la taxonomie : catégories, tags, et modération des tags proposés par les utilisateurs."
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateCategory();
            }}
            placeholder="Nom d'une nouvelle catégorie…"
            className="sm:max-w-xs"
          />
          <Button
            onClick={handleCreateCategory}
            loading={createCategory.isPending}
            disabled={!newCategory.trim()}
          >
            <Plus className="h-4 w-4" />
            Ajouter une catégorie
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Aucune catégorie" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onRename={() => handleRenameCategory(category)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  onRename,
}: {
  category: TaxonomyCategory;
  onRename: () => void;
}) {
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    const name = newTag.trim();
    if (!name) return;
    createTag.mutate(
      { categoryId: category.id, name },
      { onSuccess: () => setNewTag('') },
    );
  };

  const setStatus = (tag: TaxonomyTag, status: string) =>
    updateTag.mutate({ tagId: tag.id, payload: { status } });

  const renameTag = (tag: TaxonomyTag) => {
    const name = window.prompt('Nouveau nom du tag :', tag.name)?.trim();
    if (name && name !== tag.name) {
      updateTag.mutate({ tagId: tag.id, payload: { name } });
    }
  };

  const tags = [...category.Tag].sort((a, b) => {
    const sa = STATUS_ORDER[(a.status || 'APPROVED').toUpperCase()] ?? 1;
    const sb = STATUS_ORDER[(b.status || 'APPROVED').toUpperCase()] ?? 1;
    return sa - sb || a.name.localeCompare(b.name);
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{category.name}</CardTitle>
        <Button size="sm" variant="ghost" onClick={onRename} title="Renommer la catégorie">
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {category.Tag.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun tag.</p>
        ) : (
          <ul className="space-y-1.5">
            {tags.map((tag) => {
              const status = (tag.status || 'APPROVED').toUpperCase();
              return (
                <li
                  key={tag.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        status === 'REJECTED' && 'text-muted-foreground line-through',
                      )}
                    >
                      {tag.name}
                    </span>
                    {status === 'PENDING' && <Badge tone="warning">Proposé</Badge>}
                    {status === 'REJECTED' && <Badge tone="neutral">Masqué</Badge>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {status !== 'APPROVED' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-success"
                        title="Approuver"
                        onClick={() => setStatus(tag, 'APPROVED')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {status !== 'REJECTED' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        title="Masquer"
                        onClick={() => setStatus(tag, 'REJECTED')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Renommer"
                      onClick={() => renameTag(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex gap-2 pt-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag();
            }}
            placeholder="Nouveau tag…"
            className="h-9"
          />
          <Button
            size="sm"
            onClick={handleAddTag}
            loading={createTag.isPending}
            disabled={!newTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
