// admin-frontend/lib/auth-context.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, apiJson } from "@/lib/api-client";
import type { AdminUser } from "@/lib/types";

interface AuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  user: AdminUser | null;
  /** Re-fetch the current admin user from the backend. */
  refresh: () => Promise<void>;
  /** End the session server-side and clear local state. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    try {
      // Try the admin-specific endpoint first — returns 403 if not admin
      const me = await apiJson<AdminUser>("/api/v1/admin/me");
      setUser(me);
      setIsAdmin(true);
      return;
    } catch {
      // Not admin or not logged in — try silent refresh, then re-check
      try {
        await apiFetch("/api/v1/auth/refresh", { method: "POST" });
        const me = await apiJson<AdminUser>("/api/v1/admin/me");
        setUser(me);
        setIsAdmin(true);
      } catch {
        setUser(null);
        setIsAdmin(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      /* server session already gone — still clear locally */
    }
    setUser(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoaded,
      isSignedIn: user !== null,
      isAdmin,
      user,
      refresh,
      signOut,
    }),
    [isLoaded, user, isAdmin, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
