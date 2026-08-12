import { Bell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default function NotificationsPage() {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <PageHeader
            title="Notifications"
            description="Stay on top of new conversations, failed crawls, and teammate activity."
          />
          <Card className="border-border bg-card/50 p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Bell className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No notifications yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Important events will land here — new conversations, failed
              crawls, and teammate invitations.
            </p>
            <Link href="/settings">
              <Button variant="outline" className="gap-2">
                Configure your widget <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
