import { ReactNode } from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent "no data" state. Drop into any list/grid container.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = "Sin datos",
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-card px-6 py-12 text-center flex flex-col items-center gap-4 animate-fade-in-up",
        className,
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 -m-2 rounded-2xl bg-primary/5 blur-xl" aria-hidden />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      </div>
      <div className="max-w-md">
        <p className="display-font text-base font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
