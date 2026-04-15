import { storage } from './api';

export type OnboardingBudgetPreference = 'low' | 'medium' | 'high';

export type OnboardingRadiusPreference = 2 | 5 | 10 | 20 | 'unlimited';

export type RecommendationOnboardingPreferences = {
  budget: OnboardingBudgetPreference;
  radiusKm: OnboardingRadiusPreference;
};

const DEFAULT_PREFERENCES: RecommendationOnboardingPreferences = {
  budget: 'medium',
  radiusKm: 5,
};

const buildStorageKey = (userId?: string | null) =>
  `recommendation_onboarding_v1:${userId || 'anonymous'}`;

export async function getRecommendationOnboardingPreferences(
  userId?: string | null,
): Promise<RecommendationOnboardingPreferences> {
  const raw = await storage.getItem(buildStorageKey(userId));

  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RecommendationOnboardingPreferences>;
    return {
      budget:
        parsed.budget === 'low' || parsed.budget === 'medium' || parsed.budget === 'high'
          ? parsed.budget
          : DEFAULT_PREFERENCES.budget,
      radiusKm:
        parsed.radiusKm === 2 ||
        parsed.radiusKm === 5 ||
        parsed.radiusKm === 10 ||
        parsed.radiusKm === 20 ||
        parsed.radiusKm === 'unlimited'
          ? parsed.radiusKm
          : DEFAULT_PREFERENCES.radiusKm,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function setRecommendationOnboardingPreferences(
  value: RecommendationOnboardingPreferences,
  userId?: string | null,
): Promise<RecommendationOnboardingPreferences> {
  const normalized = {
    budget: value.budget,
    radiusKm: value.radiusKm,
  } satisfies RecommendationOnboardingPreferences;

  await storage.setItem(
    buildStorageKey(userId),
    JSON.stringify(normalized),
  );

  return normalized;
}

export async function resetRecommendationOnboardingPreferences(
  userId?: string | null,
): Promise<void> {
  await storage.removeItem(buildStorageKey(userId));
}