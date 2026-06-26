import { useIsFetching } from '@tanstack/react-query';

/** Fine barre de progression en haut, visible pendant les (re)chargements de données. */
export function GlobalFetchingBar() {
  const isFetching = useIsFetching();
  if (!isFetching) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-primary/20">
      <div className="h-full w-1/3 animate-progress bg-primary" />
    </div>
  );
}
