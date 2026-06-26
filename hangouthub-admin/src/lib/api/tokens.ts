/**
 * Stockage de session admin (web) + petit bus d'événements pour la
 * déconnexion forcée (refresh token expiré/invalide).
 */
const ACCESS_KEY = 'hoh_admin_access';
const REFRESH_KEY = 'hoh_admin_refresh';
const USER_KEY = 'hoh_admin_user';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  getUser<T>(): T | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setSession(access: string, refresh: string, user: unknown) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  setRefresh: (refresh: string) => localStorage.setItem(REFRESH_KEY, refresh),
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

type Listener = () => void;
const logoutListeners = new Set<Listener>();

export const authBus = {
  onForcedLogout(listener: Listener): () => void {
    logoutListeners.add(listener);
    return () => {
      logoutListeners.delete(listener);
    };
  },
  emitForcedLogout() {
    logoutListeners.forEach((listener) => listener());
  },
};
