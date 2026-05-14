/**
 * Classification Flow Visualization Component
 * 
 * Shows the visual progression of size classes for a species.
 * Example: Pinky → Fuzzy → Hopper → Adult
 */

import { useMemo } from "react";
import { ArrowDown, Scale, Calendar } from "lucide-react";
import type { SpeciesSizeClass } from "../runtime/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClassificationFlowProps {
  sizeClasses: SpeciesSizeClass[];
  className?: string;
}

export function ClassificationFlow({ sizeClasses, className }: ClassificationFlowProps) {
  const sortedSizeClasses = useMemo(() => {
    return [...sizeClasses]
      .filter((sc) => sc.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [sizeClasses]);

  if (sortedSizeClasses.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed bg-muted/30 p-8 text-center", className)}>
        <p className="text-sm text-muted-foreground">
          No hay clasificaciones activas configuradas
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {sortedSizeClasses.map((sizeClass, index) => (
        <div key={sizeClass.id} className="relative">
          {/* Size Class Card */}
          <div
            className={cn(
              "rounded-lg border bg-card p-4 transition-all",
              sizeClass.isDefault && "border-primary/50 bg-primary/5",
              !sizeClass.isActive && "opacity-60"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground">{sizeClass.name}</h4>
                {sizeClass.code && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    {sizeClass.code}
                  </Badge>
                )}
                {sizeClass.isDefault && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary">
                    Default
                  </Badge>
                )}
              </div>
              {sizeClass.salePrice && (
                <span className="text-sm font-bold text-primary">
                  ${sizeClass.salePrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Ranges Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Weight Range */}
              {(sizeClass.minWeightGrams !== undefined || sizeClass.maxWeightGrams !== undefined) && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Peso
                    </p>
                    <p className="font-medium truncate">
                      {sizeClass.minWeightGrams ?? 0}g -{" "}
                      {sizeClass.maxWeightGrams ?? "∞"}g
                    </p>
                  </div>
                </div>
              )}

              {/* Age Range */}
              {(sizeClass.minAgeDays !== undefined || sizeClass.maxAgeDays !== undefined) && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Edad
                    </p>
                    <p className="font-medium truncate">
                      {sizeClass.minAgeDays ?? 0}d -{" "}
                      {sizeClass.maxAgeDays ?? "∞"}d
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {sizeClass.description && (
              <p className="text-xs text-muted-foreground mt-3">{sizeClass.description}</p>
            )}
          </div>

          {/* Arrow to next class */}
          {index < sortedSizeClasses.length - 1 && (
            <div className="flex items-center justify-center py-1">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Inventory Classification Summary Component
 * 
 * Shows how many active lots are classified in each size class.
 */
interface InventoryClassificationSummaryProps {
  sizeClasses: SpeciesSizeClass[];
  lotCounts?: Record<string, number>; // sizeClassId -> count
  className?: string;
}

export function InventoryClassificationSummary({
  sizeClasses,
  lotCounts = {},
  className,
}: InventoryClassificationSummaryProps) {
  const sortedSizeClasses = useMemo(() => {
    return [...sizeClasses]
      .filter((sc) => sc.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [sizeClasses]);

  const totalLots = Object.values(lotCounts).reduce((sum, count) => sum + count, 0);

  if (sortedSizeClasses.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Distribución por Clasificación</h4>
        <Badge variant="secondary" className="text-xs">
          {totalLots.toLocaleString()} lotes activos
        </Badge>
      </div>

      <div className="space-y-2">
        {sortedSizeClasses.map((sizeClass) => {
          const count = lotCounts[sizeClass.id] ?? 0;
          const percentage = totalLots > 0 ? (count / totalLots) * 100 : 0;

          return (
            <div key={sizeClass.id} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{sizeClass.name}</span>
                  {sizeClass.isDefault && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {count.toLocaleString()}
                  </span>
                  {totalLots > 0 && (
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    sizeClass.isDefault ? "bg-primary" : "bg-secondary"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
