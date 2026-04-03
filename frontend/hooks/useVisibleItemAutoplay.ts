import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type VisibleRect = {
  y: number;
  height: number;
};

export function useVisibleItemAutoplay<T>(
  items: T[],
  getId: (item: T) => string,
) {
  const [activeId, setActiveId] = useState<string | null>(
    items[0] ? getId(items[0]) : null,
  );
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const layoutsRef = useRef(new Map<string, VisibleRect>());
  const getIdRef = useRef(getId);

  useEffect(() => {
    getIdRef.current = getId;
  }, [getId]);

  useEffect(() => {
    const validIds = new Set(items.map((item) => getIdRef.current(item)));

    layoutsRef.current.forEach((_, id) => {
      if (!validIds.has(id)) {
        layoutsRef.current.delete(id);
      }
    });
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }

    setActiveId((current) => {
      if (current && items.some((item) => getIdRef.current(item) === current)) {
        return current;
      }

      return getIdRef.current(items[0]);
    });
  }, [items]);

  const recomputeActiveId = useCallback(
    (nextScrollY: number, nextViewportHeight: number) => {
      if (items.length === 0) {
        setActiveId(null);
        return;
      }

      if (nextViewportHeight <= 0) {
        return;
      }

      const viewportTop = nextScrollY;
      const viewportBottom = viewportTop + nextViewportHeight;
      const viewportCenter = viewportTop + nextViewportHeight / 2;

      let bestId: string | null = null;
      let bestScore = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      items.forEach((item) => {
        const id = getIdRef.current(item);
        const layout = layoutsRef.current.get(id);

        if (!layout) {
          return;
        }

        const itemTop = layout.y;
        const itemBottom = layout.y + layout.height;
        const visibleHeight =
          Math.min(itemBottom, viewportBottom) - Math.max(itemTop, viewportTop);

        if (visibleHeight <= 0) {
          return;
        }

        const visibleRatio = visibleHeight / Math.max(layout.height, 1);
        const centerDistance = Math.abs(itemTop + layout.height / 2 - viewportCenter);

        if (
          visibleRatio > bestScore ||
          (Math.abs(visibleRatio - bestScore) < 0.001 && centerDistance < bestDistance)
        ) {
          bestId = id;
          bestScore = visibleRatio;
          bestDistance = centerDistance;
        }
      });

      if (bestId) {
        setActiveId(bestId);
      } else if (!activeId && items[0]) {
        setActiveId(getIdRef.current(items[0]));
      }
    },
    [activeId, items],
  );

  useEffect(() => {
    recomputeActiveId(scrollY, viewportHeight);
  }, [recomputeActiveId, scrollY, viewportHeight]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const registerLayout = useCallback((id: string, layout: VisibleRect) => {
    layoutsRef.current.set(id, layout);
  }, []);

  const activeIdSet = useMemo(() => new Set(activeId ? [activeId] : []), [activeId]);

  return {
    activeId,
    activeIdSet,
    onLayout,
    onScroll,
    registerLayout,
  };
}
