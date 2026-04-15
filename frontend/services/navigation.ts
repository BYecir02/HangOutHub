import { router } from 'expo-router';

let authRedirectPending = false;

export const safeReplace = (path: string) => {
  if (authRedirectPending) {
    return;
  }

  authRedirectPending = true;

  const attempt = (tries = 0) => {
    try {
      router.replace(path as never);
      authRedirectPending = false;
      return;
    } catch {
      if (tries >= 20) {
        authRedirectPending = false;
        return;
      }

      setTimeout(() => attempt(tries + 1), 50);
    }
  };

  setTimeout(() => attempt(0), 0);
};
