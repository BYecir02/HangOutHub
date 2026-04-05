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
  const layoutsRef = useRef(new Map<string, VisibleRect>());
  const getIdRef = useRef(getId);
  const itemsRef = useRef(items);
  const activeIdRef = useRef<string | null>(items[0] ? getId(items[0]) : null);
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    getIdRef.current = getId;
  }, [getId]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const validIds = new Set(itemsRef.current.map((item) => getIdRef.current(item)));

    layoutsRef.current.forEach((_, id) => {
      if (!validIds.has(id)) {
        layoutsRef.current.delete(id);
      }
    });
  }, [items]);

  const recomputeActiveId = useCallback(
    () => {
      const currentItems = itemsRef.current;

      if (currentItems.length === 0) {
        if (activeIdRef.current !== null) {
          activeIdRef.current = null;
          setActiveId(null);
        }
        return;
      }

      const nextScrollY = scrollYRef.current;
      const nextViewportHeight = viewportHeightRef.current;

      if (nextViewportHeight <= 0) {
        return;
      }

      const viewportTop = nextScrollY;
      const viewportBottom = viewportTop + nextViewportHeight;
      const viewportCenter = viewportTop + nextViewportHeight / 2;

      let bestId: string | null = null;
      let bestScore = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      let currentScore = 0;

      currentItems.forEach((item) => {
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

        if (id === activeIdRef.current) {
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

      const activeId = activeIdRef.current;
      const shouldSwitchToBest =
        !!bestId &&
        bestId !== activeId &&
        (activeId === null ||
          currentScore <= 0 ||
          (bestScore >= 0.55 && (bestScore - currentScore >= 0.08 || currentScore < 0.35)));

      if (shouldSwitchToBest) {
        activeIdRef.current = bestId;
        setActiveId(bestId);
      } else if (!bestId && currentItems[0]) {
        const fallbackId = getIdRef.current(currentItems[0]);
        if (fallbackId !== activeIdRef.current) {
          activeIdRef.current = fallbackId;
          setActiveId(fallbackId);
        }
      }
    },
    [],
  );

  const scheduleRecompute = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      recomputeActiveId();
    });
  }, [recomputeActiveId]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentItems = itemsRef.current;

    if (currentItems.length === 0) {
      if (activeIdRef.current !== null) {
        activeIdRef.current = null;
        setActiveId(null);
      }
      return;
    }

    const current = activeIdRef.current;
    if (current && currentItems.some((item) => getIdRef.current(item) === current)) {
      return;
    }

    const nextActiveId = getIdRef.current(currentItems[0]);
    activeIdRef.current = nextActiveId;
    setActiveId(nextActiveId);
  }, [items]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
    scheduleRecompute();
  }, [scheduleRecompute]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
    scheduleRecompute();
  }, [scheduleRecompute]);

  const registerLayout = useCallback(
    (id: string, layout: VisibleRect) => {
      layoutsRef.current.set(id, layout);
      scheduleRecompute();
    },
    [scheduleRecompute],
  );

  const activeIdSet = useMemo(() => new Set(activeId ? [activeId] : []), [activeId]);

  return {
    activeId,
    activeIdSet,
    onLayout,
    onScroll,
    registerLayout,
  };
}
