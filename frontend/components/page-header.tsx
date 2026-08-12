// frontend/components/page-header.tsx
import { cn } from "@/lib/utils";

/**
 * Consistent page chrome for every dashboard screen:
 * a clear title, optional description, and an optional actions slot.
 * Mirrors the header pattern used by Intercom / Crisp / Chatwoot dashboards.
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 mb-6 border-b border-border/70",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </div>
  );
}
