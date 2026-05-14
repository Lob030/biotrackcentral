/**
 * Availability Snapshot Card
 * 
 * Shows current operational availability grouped by species and size class.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InventoryClassificationState } from "../runtime/types";
import { AlertTriangle, TrendingDown } from "lucide-react";

interface AvailabilitySnapshotCardProps {
  speciesName: string;
  operationalName: string;
  states: InventoryClassificationState[];
  lowStockThreshold?: number;
  className?: string;
}

export function AvailabilitySnapshotCard({
  speciesName,
  operationalName,
  states,
  lowStockThreshold = 10,
  className,
}: AvailabilitySnapshotCardProps) {
  const sorted = useMemo(
    () => [...states].sort((a, b) => a.displayOrder - b.displayOrder),
    [states]
  );

  const totalAvailable = states.reduce((s, c) => s + c.available, 0);
  const totalAnimals = states.reduce((s, c) => s + c.totalAnimals, 0);
  const totalReserved = states.reduce((s, c) => s + c.reserved, 0);
  const estimatedValue = states.reduce((s, c) => s + c.estimatedValue, 0);

  return (
    <div className={cn("glass-card p-5 flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/40">
        <div>
          <h2 className="display-font text-xl font-bold">
            {operationalName || speciesName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalAvailable.toLocaleString()} disponibles · {totalAnimals.toLocaleString()} total
          </p>
        </div>
        <div className="text-right">
          {totalReserved > 0 && (
            <Badge variant="secondary" className="text-[10px] mb-1 block">
              {totalReserved} reservados
            </Badge>
          )}
          {estimatedValue > 0 && (
            <p className="text-xs text-muted-foreground">
              ${estimatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      </div>

      {/* Classification rows */}
      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground text-center">
            Sin clasificaciones configuradas
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[1.8fr_0.8fr_0.8fr_0.8fr] gap-2 px-2 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            <span>Etapa</span>
            <span className="text-right">Total</span>
            <span className="text-right">Reservado</span>
            <span className="text-right">Disponible</span>
          </div>

          {sorted.map((state) => {
            const isLow = state.available > 0 && state.available <= lowStockThreshold;
            const isEmpty = state.available === 0;

            return (
              <div
                key={state.sizeClassId}
                className={cn(
                  "grid grid-cols-[1.8fr_0.8fr_0.8fr_0.8fr] gap-2 items-center rounded-lg px-2 py-2 transition-colors",
                  !isEmpty && "bg-primary/5",
                  isLow && "bg-amber-500/10"
                )}
              >
                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      isEmpty
                        ? "bg-muted-foreground/30"
                        : isLow
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight truncate",
                        isEmpty ? "text-muted-foreground/60" : "text-foreground"
                      )}
                    >
                      {state.sizeClassName}
                    </p>
                    {state.sizeClassCode && (
                      <p className="text-[9px] text-muted-foreground/60 uppercase">
                        {state.sizeClassCode}
                      </p>
                    )}
                  </div>
                </div>

                {/* Total */}
                <span className="text-xs text-muted-foreground text-right tabular-nums">
                  {state.totalAnimals}
                </span>

                {/* Reserved */}
                <span className="text-xs text-right tabular-nums">
                  {state.reserved > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {state.reserved}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </span>

                {/* Available */}
                <div className="flex justify-end">
                  {isEmpty ? (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  ) : isLow ? (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                      <TrendingDown className="h-2.5 w-2.5 text-amber-500" />
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {state.available}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex flex-col items-center min-w-[38px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      <span className="display-font text-sm font-bold text-primary tabular-nums leading-none">
                        {state.available}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
