export function resolvePostOwnership(
  postUserId?: string,
  isOwner?: boolean,
  currentUserId?: string | null,
) {
  return Boolean(isOwner || (currentUserId && postUserId === currentUserId));
}