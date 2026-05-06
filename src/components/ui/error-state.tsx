import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  title?: string;
}

/**
 * Inline error state for list/section failures (used inside a page,
 * not as a full ErrorBoundary fallback).
 */
export function ErrorState({
  error,
  onRetry,
  className,
  title = "No se pudo cargar la información",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "glass-card border-destructive/30 p-6 flex items-start gap-3",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5 break-words">
          {friendlyError(error)}
        </p>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="mt-3 gap-1.5"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
