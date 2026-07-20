import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Notifications</h1>
        <p className="text-muted-foreground">Alerts about your knowledge base, team, and widget.</p>
      </div>
      <div className="flex-1 overflow-auto px-8 py-8 max-w-3xl">
        <Card className="border-border border-dashed bg-card/40 p-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No notifications system is wired up yet. Add an events table and emit rows from
            crawl failures, uploads, and invite acceptances to populate this page.
          </p>
        </Card>
      </div>
    </div>
  );
}