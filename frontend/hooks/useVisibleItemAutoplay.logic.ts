export type VisibleRect = {
  y: number;
  height: number;
};

export function selectVisibleItemId<T>(params: {
  items: T[];
  getId: (item: T) => string;
  layouts: Map<string, VisibleRect>;
  scrollY: number;
  viewportHeight: number;
  currentActiveId: string | null;
}) {
  const {
    items,
    getId,
    layouts,
    scrollY,
    viewportHeight,
    currentActiveId,
  } = params;

  if (items.length === 0) {
    return null;
  }

  if (viewportHeight <= 0) {
    return currentActiveId;
  }

  const viewportTop = scrollY;
  const viewportBottom = viewportTop + viewportHeight;
  const viewportCenter = viewportTop + viewportHeight / 2;
  const isNearTop = viewportTop <= 24;

  if (isNearTop && currentActiveId) {
    return currentActiveId;
  }

  let bestId: string | null = null;
  let bestScore = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let currentScore = 0;

  items.forEach((item) => {
    const id = getId(item);
    const layout = layouts.get(id);

    if (!layout) {
      return;
    }

    const itemTop = layout.y;
    const itemBottom = layout.y + layout.height;
    const visibleHeight = Math.min(itemBottom, viewportBottom) - Math.max(itemTop, viewportTop);

    if (visibleHeight <= 0) {
      return;
    }

    const visibleRatio = visibleHeight / Math.max(layout.height, 1);
    const centerDistance = Math.abs(itemTop + layout.height / 2 - viewportCenter);

    if (id === currentActiveId) {
      currentScore = visibleRatio;
    }

    if (
      visibleRatio > bestScore ||
      (Math.abs(visibleRatio - bestScore) < 0.001 && centerDistance < bestDistance)
    ) {
      bestId = id;
      bestScore = visibleRatio;
      bestDistance = centerDistance;
    }
  });

  if (
    !!bestId &&
    bestId !== currentActiveId &&
    (currentActiveId === null ||
      currentScore <= 0 ||
      (bestScore >= 0.55 && (bestScore - currentScore >= 0.08 || currentScore < 0.35)))
  ) {
    return bestId;
  }

  return currentActiveId;
}