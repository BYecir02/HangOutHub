import { selectVisibleItemId } from './useVisibleItemAutoplay.logic';

describe('selectVisibleItemId', () => {
  it('picks the most visible item inside the viewport', () => {
    const layouts = new Map([
      ['a', { y: 0, height: 100 }],
      ['b', { y: 90, height: 100 }],
      ['c', { y: 220, height: 100 }],
    ]);

    expect(
      selectVisibleItemId({
        items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        getId: (item: { id: string }) => item.id,
        layouts,
        scrollY: 80,
        viewportHeight: 120,
        currentActiveId: 'a',
      }),
    ).toBe('b');
  });

  it('returns the current item when there is no measurable viewport', () => {
    const layouts = new Map([
      ['a', { y: 0, height: 100 }],
    ]);

    expect(
      selectVisibleItemId({
        items: [{ id: 'a' }],
        getId: (item: { id: string }) => item.id,
        layouts,
        scrollY: 0,
        viewportHeight: 0,
        currentActiveId: 'a',
      }),
    ).toBe('a');
  });

  it('returns null when there are no items', () => {
    expect(
      selectVisibleItemId({
        items: [],
        getId: (item: { id: string }) => item.id,
        layouts: new Map(),
        scrollY: 0,
        viewportHeight: 100,
        currentActiveId: null,
      }),
    ).toBeNull();
  });

  it('keeps the current item when layouts are missing and no candidate is strong enough', () => {
    expect(
      selectVisibleItemId({
        items: [{ id: 'a' }, { id: 'b' }],
        getId: (item: { id: string }) => item.id,
        layouts: new Map(),
        scrollY: 0,
        viewportHeight: 100,
        currentActiveId: 'b',
      }),
    ).toBe('b');
  });

  it('keeps the current item near the top of the feed', () => {
    const layouts = new Map([
      ['a', { y: 0, height: 120 }],
      ['b', { y: 130, height: 120 }],
    ]);

    expect(
      selectVisibleItemId({
        items: [{ id: 'a' }, { id: 'b' }],
        getId: (item: { id: string }) => item.id,
        layouts,
        scrollY: 12,
        viewportHeight: 240,
        currentActiveId: 'a',
      }),
    ).toBe('a');
  });
});
