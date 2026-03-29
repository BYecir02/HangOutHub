export type PlaceTeamRole = 'MANAGER' | 'STAFF' | 'SCANNER';

const PLACE_TEAM_ROLE_LEVEL: Record<PlaceTeamRole, number> = {
  SCANNER: 1,
  STAFF: 2,
  MANAGER: 3,
};

export function normalizePlaceTeamRole(
  role: string | null | undefined,
): PlaceTeamRole | null {
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

export function hasPlaceTeamRoleAtLeast(
  role: string | null | undefined,
  required: PlaceTeamRole,
): boolean {
  const normalizedRole = normalizePlaceTeamRole(role);
  if (!normalizedRole) {
    return false;
  }

  return (
    PLACE_TEAM_ROLE_LEVEL[normalizedRole] >= PLACE_TEAM_ROLE_LEVEL[required]
  );
}

export function getHighestPlaceTeamRole(
  roles: Array<string | null | undefined>,
): PlaceTeamRole | null {
  let current: PlaceTeamRole | null = null;

  for (const role of roles) {
    const normalized = normalizePlaceTeamRole(role);
    if (!normalized) {
      continue;
    }

    if (
      !current ||
      PLACE_TEAM_ROLE_LEVEL[normalized] > PLACE_TEAM_ROLE_LEVEL[current]
    ) {
      current = normalized;
    }
  }

  return current;
}
