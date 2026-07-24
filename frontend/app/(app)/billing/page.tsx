import { CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Billing</h1>
        <p className="text-muted-foreground">Plan, usage, and payment details.</p>
      </div>
      <div className="flex-1 overflow-auto px-8 py-8 max-w-3xl">
        <Card className="border-border border-dashed bg-card/40 p-8 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No billing provider is connected yet. Wire up Stripe (or similar) and this page
            can show plan, usage-based charges, and invoices.
          </p>
        </Card>
      </div>
    </div>
  );
}
