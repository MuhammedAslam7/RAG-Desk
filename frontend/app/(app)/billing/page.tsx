import { CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default function BillingPage() {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <PageHeader
            title="Billing"
            description="Manage your plan, usage-based charges, and invoices."
          />
          <Card className="border-border bg-card/50 p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Billing is coming soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Once a payment provider is connected, you&apos;ll see your plan,
              usage-based charges, and invoices here.
            </p>
            <Link href="/settings">
              <Button variant="outline" className="gap-2">
                Manage workspace settings <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
