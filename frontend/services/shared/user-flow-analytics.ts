import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { BASE_URL, storage } from '../api';

const DISTINCT_ID_KEY = 'analyticsDistinctId';

let distinctIdPromise: Promise<string> | null = null;
const sessionId = createAnalyticsId('session');

export interface UserFlowContext {
  path: string;
  screenKey: string;
  screenName: string;
}

export interface UserFlowEventInput {
  eventName: string;
  screenPath?: string | null;
  previousScreenPath?: string | null;
  screenKey?: string | null;
  previousScreenKey?: string | null;
  screenName?: string | null;
  actionName?: string | null;
  path?: string | null;
  previousPath?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

function createAnalyticsId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isDynamicSegment(segment: string) {
  if (!segment) {
    return false;
  }

  const normalized = segment.replace(/^:+/, '');
  return (
    /^\[.*\]$/.test(segment) ||
    /^\d+$/.test(normalized) ||
    /^[0-9a-f]{8,}$/i.test(normalized) ||
    normalized.length >= 24
  );
}

function humanizeSegment(segment: string) {
  return segment
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

export function normalizeScreenKey(pathname?: string | null) {
  if (!pathname) {
    return 'home';
  }

  const trimmed = pathname.trim();
  if (!trimmed || trimmed === '/') {
    return 'home';
  }

  const segments = trimmed
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('(') && !segment.endsWith(')'))
    .filter((segment) => segment !== 'tabs' && segment !== 'stack');

  const normalized = segments
    .map((segment) => {
      if (isDynamicSegment(segment)) {
        return ':id';
      }

      return segment.toLowerCase();
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    return 'home';
  }

  if (normalized.length === 1 && normalized[0] === 'index') {
    return 'home';
  }

  return normalized.join('/');
}

export function screenNameFromKey(screenKey: string) {
  if (!screenKey || screenKey === 'home') {
    return 'Home';
  }

  const segments = screenKey
    .split('/')
    .filter(Boolean)
    .filter((segment) => segment !== ':id');

  if (segments.length === 0) {
    return 'Home';
  }

  if (segments.length === 1) {
    return humanizeSegment(segments[0]);
  }

  return segments.map((segment) => humanizeSegment(segment)).join(' / ');
}

export function buildUserFlowContext(pathname: string): UserFlowContext {
  const screenKey = normalizeScreenKey(pathname);

  return {
    path: pathname,
    screenKey,
    screenName: screenNameFromKey(screenKey),
  };
}

function resolveBuildChannel() {
  return Updates.channel || (__DEV__ ? 'development' : 'production');
}

function resolveAppVersion() {
  return Constants.expoConfig?.version || '1.0.0';
}

function resolveLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'fr-FR';
  } catch {
    return 'fr-FR';
  }
}

async function getOrCreateDistinctId() {
  if (!distinctIdPromise) {
    distinctIdPromise = (async () => {
      try {
        const stored = await storage.getItem(DISTINCT_ID_KEY);
        if (stored) {
          return stored;
        }

        const nextId = createAnalyticsId('distinct');
        await storage.setItem(DISTINCT_ID_KEY, nextId);
        return nextId;
      } catch {
        return createAnalyticsId('distinct');
      }
    })();
  }

  return distinctIdPromise;
}

function resolveContext(input: UserFlowEventInput): UserFlowContext {
  const path = input.screenPath || input.path || '/';
  const screenKey = input.screenKey || normalizeScreenKey(path);
  const screenName = input.screenName || screenNameFromKey(screenKey);

  return {
    path,
    screenKey,
    screenName,
  };
}

export async function trackUserFlowEvent(input: UserFlowEventInput) {
  try {
    const distinctId = await getOrCreateDistinctId();
    const context = resolveContext(input);
    const previousPath = input.previousScreenPath || input.previousPath || null;
    const previousScreenKey =
      input.previousScreenKey !== undefined
        ? input.previousScreenKey
        : previousPath
          ? normalizeScreenKey(previousPath)
          : null;

    const token = await storage.getItem('userToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (
      BASE_URL.includes('ngrok-free.app') ||
      BASE_URL.includes('ngrok-free.dev') ||
      BASE_URL.includes('.ngrok.io')
    ) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    const response = await fetch(`${BASE_URL}/api/v1/analytics/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventName: input.eventName,
        screenKey: context.screenKey,
        screenName: context.screenName,
        path: context.path,
        previousScreenKey,
        previousPath,
        actionName: input.actionName || null,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        distinctId,
        sessionId,
        platform: Platform.OS,
        appVersion: resolveAppVersion(),
        buildChannel: resolveBuildChannel(),
        locale: resolveLocale(),
        metadata: input.metadata || null,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analytics event rejected with status ${response.status}`);
    }
  } catch {
    // Tracking must never break the user flow.
  }
}
