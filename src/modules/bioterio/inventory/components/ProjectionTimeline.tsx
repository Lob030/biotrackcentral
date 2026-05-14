/**
 * Availability Projection Timeline
 *
 * Visual "what will be available in the next N days" timeline.
 * Answers: "In 5 days: 120 Hopper ASF available"
 */

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailabilityProjection, AvailabilityTimeline } from "../runtime/types";

interface ProjectionTimelineProps {
  projection: AvailabilityProjection;
  daysToShow?: number;
  className?: string;
}

export function ProjectionTimeline({
  projection,
  daysToShow = 14,
  className,
}: ProjectionTimelineProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<string | null>(null);

  // Generate date labels for the next N days
  const dateCols = useMemo(() => {
    const today = new Date();
    return Array.from({ length: daysToShow }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return {
        iso: d.toISOString().split("T")[0],
        label: i === 0 ? "Hoy" : i === 1 ? "Mañana" : `+${i}d`,
        dayName: d.toLocaleDateString("es", { weekday: "short" }),
      };
    });
  }, [daysToShow]);

  // Filter timelines that have data in the next N days
  const cutoff = dateCols[dateCols.length - 1].iso;
  const activeTimelines = projection.timelines.filter((t) =>
    t.dailyProjections.some((p) => p.date <= cutoff && p.projectedQuantity > 0)
  );

  if (activeTimelines.length === 0) {
    return (
      <div className={cn("glass-card p-8 text-center", className)}>
        <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">
          No hay proyecciones disponibles para los próximos {daysToShow} días.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Proyección de Disponibilidad — Próximos {daysToShow} días
        </h3>
      </div>

      {/* Timeline grid — scrollable horizontally on mobile */}
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[200px]">
                Especie / Etapa
              </th>
              {dateCols.map((col) => (
                <th
                  key={col.iso}
                  className="text-center px-1 py-3 text-[10px] font-medium text-muted-foreground"
                >
                  <div>{col.label}</div>
                  <div className="text-muted-foreground/60 text-[9px]">{col.dayName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeTimelines.map((timeline, idx) => {
              const isSelected =
                selectedTimeline === `${timeline.speciesProfileId}::${timeline.sizeClassId}`;
              const key = `${timeline.speciesProfileId}::${timeline.sizeClassId}`;

              // Build quick lookup for this timeline
              const byDate = Object.fromEntries(
                timeline.dailyProjections.map((p) => [p.date, p])
              );

              // Find max for normalization
              const maxQty = Math.max(
                ...dateCols.map(
                  (col) => byDate[col.iso]?.projectedQuantity ?? 0
                )
              );

              return (
                <tr
                  key={key}
                  className={cn(
                    "border-b border-border/30 transition-colors cursor-pointer",
                    idx % 2 === 0 ? "bg-muted/20" : "",
                    isSelected && "bg-primary/5"
                  )}
                  onClick={() => setSelectedTimeline(isSelected ? null : key)}
                >
                  {/* Label */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground text-xs">
                      {timeline.speciesName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {timeline.sizeClassName}
                    </div>
                  </td>

                  {/* Per-day cells */}
                  {dateCols.map((col) => {
                    const proj = byDate[col.iso];
                    const qty = proj?.projectedQuantity ?? 0;
                    const pct = maxQty > 0 ? (qty / maxQty) * 100 : 0;

                    return (
                      <td key={col.iso} className="px-1 py-2 text-center">
                        {qty > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {/* Mini bar */}
                            <div className="w-8 h-6 flex items-end justify-center">
                              <div
                                className={cn(
                                  "w-5 rounded-t transition-all",
                                  proj?.confidence === "high"
                                    ? "bg-primary"
                                    : proj?.confidence === "medium"
                                    ? "bg-primary/60"
                                    : "bg-primary/30"
                                )}
                                style={{ height: `${Math.max(4, (pct / 100) * 24)}px` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold tabular-nums text-foreground">
                              {qty}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Peak windows */}
      {projection.timelines.some((t) => t.peakWindow) && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Ventanas de Máxima Disponibilidad
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projection.timelines
              .filter((t) => t.peakWindow)
              .map((t) => (
                <div
                  key={`${t.speciesProfileId}::${t.sizeClassId}`}
                  className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
                >
                  <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {t.speciesName} · {t.sizeClassName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Pico {t.peakWindow!.maximumQuantity} uds ·{" "}
                      {new Date(t.peakWindow!.startDate).toLocaleDateString("es", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 shrink-0",
                      t.peakWindow!.confidence === "high"
                        ? "border-green-500/30 text-green-600 dark:text-green-400"
                        : "border-amber-500/30 text-amber-600"
                    )}
                  >
                    {t.peakWindow!.confidence === "high" ? "Alta" : "Media"}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {projection.bottlenecks.length > 0 && (
        <div className="space-y-2">
          {projection.bottlenecks.map((b, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border px-4 py-3 text-sm flex items-start gap-3",
                b.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
              )}
            >
              <span className="text-base leading-none mt-0.5">
                {b.severity === "critical" ? "🚨" : "⚠️"}
              </span>
              <p className="text-xs">{b.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
