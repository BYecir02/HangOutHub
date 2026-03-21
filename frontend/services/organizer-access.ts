export interface OrganizerAccessUser {
  role?: string | null;
  hasPlace?: boolean | null;
  organizerStatus?: string | null;
}

export type OrganizerAccessDenialReason =
  | 'NOT_ORGANIZER'
  | 'PENDING'
  | 'REJECTED'
  | 'SUSPENDED';

export function isOrganizerRole(role?: string | null): boolean {
  return role === 'ORGANIZER' || role === 'PLACE_OWNER';
}

export function isOrganizerUser(user?: OrganizerAccessUser | null): boolean {
  return isOrganizerRole(user?.role);
}

export function isOrganizerPending(user?: OrganizerAccessUser | null): boolean {
  return user?.organizerStatus === 'PENDING';
}

export function isOrganizerRejected(user?: OrganizerAccessUser | null): boolean {
  return user?.organizerStatus === 'REJECTED';
}

export function isOrganizerSuspended(user?: OrganizerAccessUser | null): boolean {
  return user?.organizerStatus === 'SUSPENDED';
}

export function canAccessOrganizerPanel(user?: OrganizerAccessUser | null): boolean {
  return (
    isOrganizerUser(user)
    && !isOrganizerPending(user)
    && !isOrganizerRejected(user)
    && !isOrganizerSuspended(user)
  );
}

export function getOrganizerAccessDenialReason(
  user?: OrganizerAccessUser | null,
): OrganizerAccessDenialReason | null {
  if (!isOrganizerUser(user)) {
    return 'NOT_ORGANIZER';
  }

  if (isOrganizerPending(user)) {
    return 'PENDING';
  }

  if (isOrganizerRejected(user)) {
    return 'REJECTED';
  }

  if (isOrganizerSuspended(user)) {
    return 'SUSPENDED';
  }

  return null;
}

export function getOrganizerEntryPath(
  user?: OrganizerAccessUser | null,
): '/organizer/create-place' | '/organizer/dashboard' {
  if (user?.role === 'PLACE_OWNER' && !user?.hasPlace) {
    return '/organizer/create-place';
  }

  return '/organizer/dashboard';
}
