import { Category } from '@/shared/types';
import type { AnimationObject } from 'lottie-react-native';
import cultureAnimationJson from '@/assets/lottie/wired-lineal-1953-african-culture-hover-pinch.json';
import natureAnimationJson from '@/assets/lottie/wired-lineal-1827-growing-plant-hover-pinch.json';
import barAnimationJson from '@/assets/lottie/wired-lineal-1979-hookah-hover-pinch.json';
import festivalAnimationJson from '@/assets/lottie/wired-lineal-1103-confetti-hover-pinch.json';

type AnimationSource = AnimationObject | { uri: string };

export type AnimationMeta = {
  source: AnimationSource;
  size: number;
  container: number;
};

const FALLBACK_ANIMATIONS: Record<string, AnimationMeta> = {
  culture: {
    source: cultureAnimationJson as AnimationObject,
    size: 32,
    container: 32,
  },
  nature: {
    source: natureAnimationJson as AnimationObject,
    size: 32,
    container: 32,
  },
  bar: {
    source: barAnimationJson as AnimationObject,
    size: 32,
    container: 32,
  },
  festival: {
    source: festivalAnimationJson as AnimationObject,
    size: 32,
    container: 32,
  },
};

const matchesKey = (name: string, key: string) => name.includes(key);

export function getCategoryAnimation(category: Category): AnimationMeta | null {
  if (category.animationUrl) {
    return {
      source: { uri: category.animationUrl },
      size: 32,
      container: 32,
    };
  }

  const lowered = category.name.toLowerCase();

  if (matchesKey(lowered, 'art') || matchesKey(lowered, 'culture')) {
    return FALLBACK_ANIMATIONS.culture;
  }

  if (matchesKey(lowered, 'nature') || matchesKey(lowered, 'garden') || matchesKey(lowered, 'park')) {
    return FALLBACK_ANIMATIONS.nature;
  }

  if (matchesKey(lowered, 'bar') || matchesKey(lowered, 'lounge') || matchesKey(lowered, 'hookah')) {
    return FALLBACK_ANIMATIONS.bar;
  }

  if (matchesKey(lowered, 'festival')) {
    return FALLBACK_ANIMATIONS.festival;
  }

  return null;
}
