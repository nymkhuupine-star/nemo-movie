"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getBrowserClient } from "@/lib/supabase-browser";

type User = { id: string; email: string };
export type AuthTab = "login" | "register" | "forgot";

type AppState = {
  user: User | null;
  logout: () => Promise<void>;
  authOpen: AuthTab | null;
  openAuth: (tab?: AuthTab) => void;
  closeAuth: () => void;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const AppContext = createContext<AppState | null>(null);

const FAVORITES_KEY = "nemo:favorites";
// Left over from the old demo login; removed on load.
const LEGACY_USER_KEY = "nemo:user";

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
    writeStorage(LEGACY_USER_KEY, null);

    // Supabase Auth session: restored from storage and kept in sync.
    const supabase = getBrowserClient();
    if (!supabase) return;
    const toUser = (u: { id: string; email?: string } | null | undefined) =>
      u ? { id: u.id, email: u.email ?? "" } : null;
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session?.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await getBrowserClient()?.auth.signOut();
    setUser(null);
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
      logout,
      authOpen,
      openAuth: (tab = "login") => setAuthOpen(tab),
      closeAuth: () => setAuthOpen(null),
      favorites,
      isFavorite: (id) => favorites.includes(id),
      toggleFavorite,
    }),
    [user, logout, authOpen, favorites, toggleFavorite],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
