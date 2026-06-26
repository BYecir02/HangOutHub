import { useEffect, useState, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';

import { resolveMediaUrl } from '@/lib/media';

export interface ImagesState {
  coverFile: File | null;
  keptImages: string[];
  newFiles: File[];
}

interface ImagesEditorProps {
  coverUrl: string | null;
  images: string[];
  onChange: (state: ImagesState) => void;
  /**
   * Identité de l'entité (ex: id du lieu/event). L'éditeur ne se ré-initialise
   * QUE quand cette valeur change — pas sur un refetch en arrière-plan, ce qui
   * éviterait d'effacer une sélection d'image en cours.
   */
  resetKey?: string | number;
}

interface NewImage {
  file: File;
  url: string;
}

/** Éditeur d'images (couverture + galerie) réutilisable (lieux, événements…). */
export function ImagesEditor({
  coverUrl,
  images,
  onChange,
  resetKey,
}: ImagesEditorProps) {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [keptImages, setKeptImages] = useState<string[]>(images);
  const [newImages, setNewImages] = useState<NewImage[]>([]);

  // (Ré)initialise UNIQUEMENT quand on change d'entité (resetKey), jamais sur un
  // simple refetch -> ne casse pas une sélection d'image en cours.
  useEffect(() => {
    setCoverFile(null);
    setCoverPreview(null);
    setKeptImages(images);
    setNewImages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Remonte l'état au parent à chaque modification.
  useEffect(() => {
    onChange({ coverFile, keptImages, newFiles: newImages.map((n) => n.file) });
  }, [coverFile, keptImages, newImages, onChange]);

  const handleCover = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleGallery = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setNewImages((prev) => [
      ...prev,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    e.target.value = '';
  };

  const cover = coverPreview ?? resolveMediaUrl(coverUrl);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Couverture
        </p>
        <div className="flex items-center gap-3">
          <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
            {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent">
            <ImagePlus className="h-4 w-4" />
            Changer la couverture
            <input type="file" accept="image/*" className="hidden" onChange={handleCover} />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Galerie
        </p>
        <div className="flex flex-wrap gap-2">
          {keptImages.map((url) => (
            <Thumb
              key={url}
              src={resolveMediaUrl(url) ?? ''}
              onRemove={() => setKeptImages((prev) => prev.filter((u) => u !== url))}
            />
          ))}
          {newImages.map((image) => (
            <Thumb
              key={image.url}
              src={image.url}
              badge="Nouveau"
              onRemove={() =>
                setNewImages((prev) => prev.filter((x) => x.url !== image.url))
              }
            />
          ))}
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:bg-accent">
            <ImagePlus className="h-5 w-5" />
            Ajouter
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGallery}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function Thumb({
  src,
  onRemove,
  badge,
}: {
  src: string;
  onRemove: () => void;
  badge?: string;
}) {
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-md bg-muted">
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white transition-colors hover:bg-black/80"
        aria-label="Retirer l'image"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {badge && (
        <span className="absolute inset-x-0 bottom-0 bg-primary/80 py-0.5 text-center text-[10px] text-primary-foreground">
          {badge}
        </span>
      )}
    </div>
  );
}
