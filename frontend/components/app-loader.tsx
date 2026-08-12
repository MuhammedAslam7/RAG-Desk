// frontend/components/app-loader.tsx
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-full w-full flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-card">
        <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
