import {
  collectPrefetchUrls,
  getLatestFeedPostCreatedAtTime,
  mergeFeedPosts,
  splitFeedPostsBySeenAt,
} from './social-feed.utils';

describe('mergeFeedPosts', () => {
  it('sorts posts by createdAt descending regardless of arrival order', () => {
    const result = mergeFeedPosts(
      [
        { id: 'b', createdAt: '2026-04-05T10:01:00.000Z' },
        { id: 'a', createdAt: '2026-04-05T10:03:00.000Z' },
      ],
      [
        { id: 'c', createdAt: '2026-04-05T09:59:00.000Z' },
      ],
    );

    expect(result.map((post) => post.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps incoming posts first when prepending and preserves unseen current posts', () => {
    const result = mergeFeedPosts(
      [
        { id: 'b', content: 'new', createdAt: '2026-04-05T10:02:00.000Z' },
        { id: 'a', content: 'updated', createdAt: '2026-04-05T10:03:00.000Z' },
      ],
      [
        { id: 'c', content: 'older', createdAt: '2026-04-05T09:59:00.000Z' },
        { id: 'a', content: 'old', createdAt: '2026-04-05T10:00:00.000Z' },
      ],
    );

    expect(result.map((post) => post.id)).toEqual(['a', 'b', 'c']);
    expect(result.find((post) => post.id === 'a')?.content).toBe('updated');
  });

  it('appends new posts after the current list when requested', () => {
    const result = mergeFeedPosts(
      [{ id: 'b', content: 'new', createdAt: '2026-04-05T10:02:00.000Z' }],
      [{ id: 'a', content: 'current', createdAt: '2026-04-05T10:03:00.000Z' }],
      'append',
    );

    expect(result.map((post) => post.id)).toEqual(['a', 'b']);
  });
});

describe('collectPrefetchUrls', () => {
  it('returns nearby non-video media without duplicates', () => {
    const result = collectPrefetchUrls(
      [
        { id: 'a', images: ['https://cdn.example.com/a.jpg'] },
        {
          id: 'b',
          images: [
            'https://cdn.example.com/b.mp4',
            'https://cdn.example.com/b.jpg',
            'https://cdn.example.com/b.jpg',
          ],
        },
        { id: 'c', images: ['https://cdn.example.com/c.png'] },
      ],
      'b',
    );

    expect(result).toEqual([
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/c.png',
    ]);
  });

  it('can prefetch farther ahead for a sliding feed window', () => {
    const result = collectPrefetchUrls(
      [
        { id: 'a', images: ['https://cdn.example.com/a.jpg'] },
        { id: 'b', images: ['https://cdn.example.com/b.jpg'] },
        { id: 'c', images: ['https://cdn.example.com/c.jpg'] },
        { id: 'd', images: ['https://cdn.example.com/d.jpg'] },
        { id: 'e', images: ['https://cdn.example.com/e.jpg'] },
      ],
      'b',
      {
        afterCount: 3,
        beforeCount: 0,
      },
    );

    expect(result).toEqual([
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/c.jpg',
      'https://cdn.example.com/d.jpg',
      'https://cdn.example.com/e.jpg',
    ]);
  });
});

describe('splitFeedPostsBySeenAt', () => {
  it('separates already seen posts from unseen ones', () => {
    const result = splitFeedPostsBySeenAt(
      [
        { id: 'a', createdAt: '2026-04-05T10:01:00.000Z' },
        { id: 'b', createdAt: '2026-04-05T10:05:00.000Z' },
        { id: 'c', createdAt: '2026-04-05T09:59:00.000Z' },
      ],
      new Date('2026-04-05T10:02:00.000Z').getTime(),
    );

    expect(result.seenPosts.map((post) => post.id)).toEqual(['a', 'c']);
    expect(result.unseenPosts.map((post) => post.id)).toEqual(['b']);
  });
});

describe('getLatestFeedPostCreatedAtTime', () => {
  it('returns the latest createdAt timestamp', () => {
    expect(
      getLatestFeedPostCreatedAtTime([
        { id: 'a', createdAt: '2026-04-05T10:01:00.000Z' },
        { id: 'b', createdAt: '2026-04-05T10:05:00.000Z' },
        { id: 'c', createdAt: '2026-04-05T09:59:00.000Z' },
      ]),
    ).toBe(new Date('2026-04-05T10:05:00.000Z').getTime());
  });
});
