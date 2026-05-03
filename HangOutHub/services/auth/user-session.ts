import api, { clearAuthState, storage } from '../api';

import { disconnectDirectChatSocket } from '../messaging/direct-chat-realtime';

const USER_INFO_KEY = 'userInfo';

export interface StoredUserSession {
  id?: string;
  username?: string;
  email?: string;
  emailVerifiedAt?: string | Date | null;
  displayName?: string | null;
  role?: string;
  hasPlace?: boolean;
  organizerStatus?: string;
  teamRole?: string;
  residenceCityId?: number | null;
  cityInterestIds?: number[];
  tagInterestIds?: number[];
}

type UserSessionLike = {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  emailVerifiedAt?: string | Date | null;
  displayName?: string | null;
  role?: string | null;
  hasPlace?: boolean | null;
  organizerStatus?: string | null;
  teamRole?: string | null;
  residenceCityId?: number | null;
  UserCityInterest?: Array<{ cityId?: number | null } | null> | null;
  UserTagInterest?: Array<{ tagId?: number | null } | null> | null;
  OrganizerProfile?: {
    status?: string | null;
  } | null;
};

function normalizeUserSession(input: UserSessionLike): StoredUserSession {
  const organizerStatus =
    input.organizerStatus || input.OrganizerProfile?.status || undefined;

  return {
    id: input.id || undefined,
    username: input.username || undefined,
    email: input.email || undefined,
    emailVerifiedAt: input.emailVerifiedAt ?? null,
    displayName: input.displayName || null,
    role: input.role || undefined,
    // Preserve unknown state to avoid false redirects for PLACE_OWNER on cold start.
    hasPlace: input.hasPlace ?? undefined,
    organizerStatus,
    teamRole: input.teamRole || undefined,
    residenceCityId:
      typeof input.residenceCityId === 'number' ? input.residenceCityId : null,
    cityInterestIds: Array.isArray(input.UserCityInterest)
      ? input.UserCityInterest.map((item) => item?.cityId)
          .filter((value): value is number => typeof value === 'number')
      : undefined,
    tagInterestIds: Array.isArray(input.UserTagInterest)
      ? input.UserTagInterest.map((item) => item?.tagId)
          .filter((value): value is number => typeof value === 'number')
      : undefined,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toUserSessionLike(value: unknown): UserSessionLike | null {
  if (!isObject(value)) {
    return null;
  }

  return value as UserSessionLike;
}

export async function getStoredUserSession(): Promise<StoredUserSession | null> {
  const raw = await storage.getItem(USER_INFO_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const asSession = toUserSessionLike(parsed);

    if (!asSession) {
      return null;
    }

    return normalizeUserSession(asSession);
  } catch {
    return null;
  }
}

export async function setStoredUserSession(
  user: UserSessionLike,
): Promise<StoredUserSession> {
  const normalized = normalizeUserSession(user);
  await storage.setItem(USER_INFO_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function patchStoredUserSession(
  patch: Partial<StoredUserSession>,
): Promise<StoredUserSession | null> {
  const current = await getStoredUserSession();

  if (!current) {
    return null;
  }

  const merged: StoredUserSession = {
    ...current,
    ...patch,
  };

  await storage.setItem(USER_INFO_KEY, JSON.stringify(merged));
  return merged;
}

export async function clearStoredUserSession(): Promise<void> {
  await storage.removeItem(USER_INFO_KEY);
  disconnectDirectChatSocket();
}

export async function syncStoredUserSessionFromApi(): Promise<StoredUserSession | null> {
  try {
    const response = await api.get<UserSessionLike>('/users/me');
    return setStoredUserSession(response.data);
  } catch (error) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: { status?: number } }).response?.status === 'number'
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    if (status === 401) {
      await clearAuthState();
      return null;
    }

    return null;
  }
}

export async function resolveStoredUserSession(): Promise<StoredUserSession | null> {
  const synced = await syncStoredUserSessionFromApi();

  if (synced) {
    return synced;
  }

  return getStoredUserSession();
}

export function hasCompletedTasteOnboarding(
  session: StoredUserSession | null,
): boolean {
  if (!session) {
    return false;
  }

  const selectedTagIds = session.tagInterestIds || [];

  return Boolean(session.residenceCityId) && selectedTagIds.length >= 3;
}