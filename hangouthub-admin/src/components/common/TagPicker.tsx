import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Badge, Input } from '@/components/ui';
import type { Category } from '@/features/categories/categories.api';

interface FlatTag {
  id: number;
  name: string;
  category: string;
}

interface TagPickerProps {
  categories: Category[] | undefined;
  value: number[];
  onChange: (next: number[]) => void;
  /** Nombre max de résultats affichés sous la recherche. */
  maxResults?: number;
}

/**
 * Sélecteur de tags multi-valeurs avec recherche (typeahead) — passe à l'échelle
 * quel que soit le nombre de tags. Réutilisable (lieux, événements…).
 */
export function TagPicker({ categories, value, onChange, maxResults = 30 }: TagPickerProps) {
  const [query, setQuery] = useState('');

  const allTags = useMemo<FlatTag[]>(() => {
    const list: FlatTag[] = [];
    categories?.forEach((category) =>
      category.Tag?.forEach((tag) =>
        list.push({ id: tag.id, name: tag.name, category: category.name }),
      ),
    );
    return list;
  }, [categories]);

  const tagById = useMemo(() => {
    const map = new Map<number, FlatTag>();
    allTags.forEach((tag) => map.set(tag.id, tag));
    return map;
  }, [allTags]);

  const selected = value
    .map((id) => tagById.get(id))
    .filter((tag): tag is FlatTag => Boolean(tag));

  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return allTags
      .filter(
        (tag) =>
          !value.includes(tag.id) &&
          (tag.name.toLowerCase().includes(normalizedQuery) ||
            tag.category.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, maxResults);
  }, [allTags, normalizedQuery, value, maxResults]);

  const add = (id: number) => onChange([...value, id]);
  const remove = (id: number) => onChange(value.filter((tagId) => tagId !== id));

  return (
    <div className="space-y-2">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-sm text-primary"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => remove(tag.id)}
                className="rounded-full p-0.5 hover:bg-primary/20"
                aria-label={`Retirer ${tag.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun tag sélectionné.</p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un tag à ajouter…"
          className="pl-9"
        />
      </div>

      {normalizedQuery && (
        <div className="max-h-56 overflow-y-auto rounded-md border border-border">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Aucun tag trouvé.</p>
          ) : (
            results.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => add(tag.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <span>{tag.name}</span>
                <Badge tone="neutral">{tag.category}</Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
