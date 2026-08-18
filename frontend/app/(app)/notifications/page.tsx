"use client";

import Link from "next/link";
import { Bell, BookOpen, CheckCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const { items, total, unreadCount, loading, markRead, markAllRead } =
    useNotifications();

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>

          {loading ? (
            <Card className="border-border bg-card/50 p-12 text-center">
              <Loader2 className="h-6 w-6 text-muted-foreground mx-auto animate-spin" />
            </Card>
          ) : items.length === 0 ? (
            <Card className="border-border bg-card/50 p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No notifications yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                When you or a teammate adds knowledge, everyone in the
                workspace gets notified here instantly.
              </p>
              <Link href="/knowledge">
                <Button variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Go to Knowledge
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <Card
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn(
                    "border-border bg-card/50 p-4 transition-colors",
                    !n.read &&
                      "border-primary/30 bg-primary/[0.04] hover:bg-primary/[0.07] cursor-pointer"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full flex-shrink-0",
                        n.read ? "bg-muted" : "bg-primary"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {n.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {n.actorName ? `by ${n.actorName}` : "System"} •{" "}
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              {items.length < total && (
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Showing {items.length} of {total}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
