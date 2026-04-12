import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import {
  selectVisibleItemId,
  selectVisibleItemIds,
  type VisibleRect,
} from './useVisibleItemAutoplay.logic';

function areSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

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
  const visibleIdSetRef = useRef<Set<string>>(
    new Set(items[0] ? [getId(items[0])] : []),
  );
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isMomentumScrollingRef = useRef(false);
  const pendingRecomputeRef = useRef(false);
  const [visibleIdSet, setVisibleIdSet] = useState<Set<string>>(
    () => new Set(items[0] ? [getId(items[0])] : []),
  );

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
    visibleIdSetRef.current = visibleIdSet;
  }, [visibleIdSet]);

  useEffect(() => {
    const validIds = new Set(itemsRef.current.map((item) => getIdRef.current(item)));

    layoutsRef.current.forEach((_, id) => {
      if (!validIds.has(id)) {
        layoutsRef.current.delete(id);
      }
    });
  }, [items]);

  const recomputeActiveId = useCallback(() => {
    const visibleItems = selectVisibleItemIds({
      items: itemsRef.current,
      getId: getIdRef.current,
      layouts: layoutsRef.current,
      scrollY: scrollYRef.current,
      viewportHeight: viewportHeightRef.current,
      currentActiveId: activeIdRef.current,
    });

    const nextVisibleIdSet = new Set(visibleItems);
    if (!areSetsEqual(nextVisibleIdSet, visibleIdSetRef.current)) {
      visibleIdSetRef.current = nextVisibleIdSet;
      setVisibleIdSet(nextVisibleIdSet);
    }

    const nextActiveId = selectVisibleItemId({
      items: itemsRef.current,
      getId: getIdRef.current,
      layouts: layoutsRef.current,
      scrollY: scrollYRef.current,
      viewportHeight: viewportHeightRef.current,
      currentActiveId: activeIdRef.current,
    });

    if (nextActiveId !== activeIdRef.current) {
      activeIdRef.current = nextActiveId;
      setActiveId(nextActiveId);
    }
  }, []);

  const scheduleRecompute = useCallback(() => {
    if (isDraggingRef.current || isMomentumScrollingRef.current) {
      pendingRecomputeRef.current = true;
      return;
    }

    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      if (isDraggingRef.current || isMomentumScrollingRef.current) {
        pendingRecomputeRef.current = true;
        return;
      }

      if (pendingRecomputeRef.current) {
        pendingRecomputeRef.current = false;
      }

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
      if (visibleIdSetRef.current.size > 0) {
        visibleIdSetRef.current = new Set();
        setVisibleIdSet(new Set());
      }
      return;
    }

    const current = activeIdRef.current;
    const nextVisibleIdSet = new Set(
      selectVisibleItemIds({
        items: currentItems,
        getId: getIdRef.current,
        layouts: layoutsRef.current,
        scrollY: scrollYRef.current,
        viewportHeight: viewportHeightRef.current,
        currentActiveId: current,
      }),
    );

    if (!areSetsEqual(nextVisibleIdSet, visibleIdSetRef.current)) {
      visibleIdSetRef.current = nextVisibleIdSet;
      setVisibleIdSet(nextVisibleIdSet);
    }

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

  const beginInteraction = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const endInteraction = useCallback(() => {
    isDraggingRef.current = false;

    if (!isMomentumScrollingRef.current && pendingRecomputeRef.current) {
      scheduleRecompute();
    }
  }, [scheduleRecompute]);

  const beginMomentum = useCallback(() => {
    isMomentumScrollingRef.current = true;
  }, []);

  const endMomentum = useCallback(() => {
    isMomentumScrollingRef.current = false;

    if (!isDraggingRef.current && pendingRecomputeRef.current) {
      scheduleRecompute();
    }
  }, [scheduleRecompute]);

  const activeIdSet = useMemo(() => new Set(activeId ? [activeId] : []), [activeId]);

  return {
    activeId,
    activeIdSet,
    visibleIdSet,
    beginInteraction,
    beginMomentum,
    endInteraction,
    endMomentum,
    onLayout,
    onScroll,
    registerLayout,
  };
}
