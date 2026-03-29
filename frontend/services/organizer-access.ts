export interface OrganizerAccessUser {
  role?: string | null;
  hasPlace?: boolean | null;
  organizerStatus?: string | null;
  teamRole?: string | null;
}

export type OrganizerAccessDenialReason =
  | 'NOT_ORGANIZER'
  | 'PENDING'
  | 'REJECTED'
  | 'SUSPENDED';

export type TeamWorkspaceRole = 'MANAGER' | 'STAFF' | 'SCANNER';

export type OrganizerCapability =
  | 'actionCenter'
  | 'dashboard'
  | 'profile'
  | 'events'
  | 'places'
  | 'scanner'
  | 'notifications'
  | 'settings'
  | 'placeTeam'
  | 'eventTeam'
  | 'eventRevisions';

export function isOrganizerRole(role?: string | null): boolean {
  return role === 'ORGANIZER' || role === 'PLACE_OWNER';
}

export function normalizeTeamWorkspaceRole(
  role?: string | null,
): TeamWorkspaceRole | null {
  if (!role) {
    return null;
  }

  const normalized = role.toUpperCase();
  if (
    normalized === 'MANAGER' ||
    normalized === 'STAFF' ||
    normalized === 'SCANNER'
  ) {
    return normalized;
  }

  return null;
}

const TEAM_ROLE_LEVEL: Record<TeamWorkspaceRole, number> = {
  SCANNER: 1,
  STAFF: 2,
  MANAGER: 3,
};

export function getHighestTeamWorkspaceRole(
  roles: Array<string | null | undefined>,
): TeamWorkspaceRole | null {
  let current: TeamWorkspaceRole | null = null;

  for (const role of roles) {
    const normalized = normalizeTeamWorkspaceRole(role);
    if (!normalized) {
      continue;
    }

    if (!current || TEAM_ROLE_LEVEL[normalized] > TEAM_ROLE_LEVEL[current]) {
      current = normalized;
    }
  }

  return current;
}

export function isOrganizerUser(user?: OrganizerAccessUser | null): boolean {
  return isOrganizerRole(user?.role);
}

export function hasTeamWorkspaceAccess(
  user?: OrganizerAccessUser | null,
): boolean {
  return Boolean(normalizeTeamWorkspaceRole(user?.teamRole));
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
  if (hasTeamWorkspaceAccess(user)) {
    return true;
  }

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
  if (hasTeamWorkspaceAccess(user)) {
    return null;
  }

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
): '/organizer/create-place' | '/organizer/dashboard' | '/organizer/events' | '/organizer/scanner' {
  const teamRole = normalizeTeamWorkspaceRole(user?.teamRole);
  if (teamRole === 'SCANNER') {
    return '/organizer/scanner';
  }
  if (teamRole === 'STAFF') {
    return '/organizer/events';
  }
  if (teamRole === 'MANAGER') {
    return '/organizer/dashboard';
  }

  // Redirect to place creation only when we explicitly know the owner has no place.
  if (user?.role === 'PLACE_OWNER' && user?.hasPlace === false) {
    return '/organizer/create-place';
  }

  return '/organizer/dashboard';
}

export function canAccessOrganizerCapability(
  user: OrganizerAccessUser | null | undefined,
  capability: OrganizerCapability,
): boolean {
  const normalizedTeamRole = normalizeTeamWorkspaceRole(user?.teamRole);
  const isOrganizerApproved =
    isOrganizerUser(user) &&
    !isOrganizerPending(user) &&
    !isOrganizerRejected(user) &&
    !isOrganizerSuspended(user);

  if (isOrganizerApproved) {
    return true;
  }

  if (!normalizedTeamRole) {
    return false;
  }

  if (capability === 'actionCenter') {
    return normalizedTeamRole === 'MANAGER' || normalizedTeamRole === 'STAFF';
  }

  if (normalizedTeamRole === 'MANAGER') {
    return true;
  }

  if (normalizedTeamRole === 'STAFF') {
    return (
      capability === 'profile' ||
      capability === 'events' ||
      capability === 'scanner' ||
      capability === 'notifications' ||
      capability === 'settings' ||
      capability === 'eventTeam' ||
      capability === 'eventRevisions'
    );
  }

  return (
    capability === 'scanner' ||
    capability === 'profile' ||
    capability === 'settings'
  );
}
