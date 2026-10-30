"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type User = { email: string };

type AppState = {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
  authOpen: "login" | "register" | null;
  openAuth: (tab?: "login" | "register") => void;
  closeAuth: () => void;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const AppContext = createContext<AppState | null>(null);

const FAVORITES_KEY = "nemo:favorites";
const USER_KEY = "nemo:user";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); state still works in memory.
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState<AppState["authOpen"]>(null);

  useEffect(() => {
    // Hydrate persisted state after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(readStorage<string[]>(FAVORITES_KEY, []));
    setUser(readStorage<User | null>(USER_KEY, null));
  }, []);

  const login = useCallback((email: string) => {
    const next = { email };
    setUser(next);
    writeStorage(USER_KEY, next);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    writeStorage(USER_KEY, null);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      writeStorage(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      user,
      login,
      logout,
      authOpen,
      openAuth: (tab = "login") => setAuthOpen(tab),
      closeAuth: () => setAuthOpen(null),
      favorites,
      isFavorite: (id) => favorites.includes(id),
      toggleFavorite,
    }),
    [user, login, logout, authOpen, favorites, toggleFavorite],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
