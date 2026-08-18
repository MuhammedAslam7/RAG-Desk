"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, apiJson } from "@/lib/api-client";
import { AppNotification, NotificationList } from "@/types";

interface NotificationsValue {
  items: AppNotification[];
  total: number;
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

/**
 * Global notification state: one SSE stream per signed-in user so the sidebar
 * unread badge updates instantly when a teammate adds knowledge, plus the
 * notification list for the /notifications page.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    apiJson<NotificationList>("/api/v1/notifications?limit=50")
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
      })
      .catch((err) => console.error("Failed to load notifications:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  // Real-time event stream — EventSource reconnects automatically on drop.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/events`,
      { withCredentials: true }
    );
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        if (evt?.type !== "notification") return;
        if (typeof evt.unreadCount === "number") setUnreadCount(evt.unreadCount);
        if (evt.notification) {
          setItems((prev) => [evt.notification, ...prev]);
          setTotal((t) => t + 1);
        }
      } catch {
        /* ignore heartbeats / non-JSON frames */
      }
    };
    return () => es.close();
  }, [isLoaded, isSignedIn]);

  const markRead = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch("/api/v1/notifications/read-all", { method: "POST" });
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ items, total, unreadCount, loading, markRead, markAllRead }),
    [items, total, unreadCount, loading, markRead, markAllRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
