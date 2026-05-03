import { resolvePostOwnership } from './post-ownership';

describe('resolvePostOwnership', () => {
  it('returns true when the API already marks the post as owned', () => {
    expect(resolvePostOwnership('other-user', true, 'current-user')).toBe(true);
  });

  it('returns true when the current user owns the post', () => {
    expect(resolvePostOwnership('current-user', false, 'current-user')).toBe(true);
  });

  it('returns false when the post belongs to someone else', () => {
    expect(resolvePostOwnership('other-user', false, 'current-user')).toBe(false);
  });
});