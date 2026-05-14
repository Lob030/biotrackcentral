/**
 * Inventory Availability Page
 *
 * Route: /bioterio/stock  (replaces existing Stock.tsx)
 *
 * This is the operational core for:
 * - Current available inventory by classification
 * - Forward-looking projections
 * - Reservation management
 * - Validation alerts
 */

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Boxes,
  RefreshCw,
  Info,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useOperationalAvailability } from "../inventory/runtime/hooks";
import { AvailabilitySnapshotCard } from "../inventory/components/AvailabilitySnapshotCard";
import { ProjectionTimeline } from "../inventory/components/ProjectionTimeline";

export default function InventoryAvailability() {
  const { profile } = useAuth();
  const workspaceId = profile?.workspace_id || profile?.organization_id;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showProjection, setShowProjection] = useState(true);

  const {
    snapshot,
    projection,
    validation,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useOperationalAvailability(workspaceId);

  // Fetch species profiles for display names
  const { data: speciesProfiles = [] } = useQuery({
    queryKey: ["species-profiles-for-stock", workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workspace_species_profiles")
        .select("id, species_name, operational_name")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  // Group classification states by species profile
  const statesBySpecies = useMemo(() => {
    if (!snapshot) return {};
    const grouped: Record<
      string,
      { speciesName: string; operationalName: string; states: typeof snapshot.classificationStates }
    > = {};

    for (const state of snapshot.classificationStates) {
      if (!grouped[state.speciesProfileId]) {
        const profile = speciesProfiles.find(
          (p: any) => p.id === state.speciesProfileId
        );
        grouped[state.speciesProfileId] = {
          speciesName: state.speciesName || profile?.species_name || "—",
          operationalName: state.operationalName || profile?.operational_name || "—",
          states: [],
        };
      }
      grouped[state.speciesProfileId].states.push(state);
    }
    return grouped;
  }, [snapshot, speciesProfiles]);

  const totalAvailable = snapshot?.summary.totalAvailable ?? 0;
  const totalAnimals = snapshot
    ? snapshot.classificationStates.reduce((s, c) => s + c.totalAnimals, 0)
    : 0;
  const totalReserved = snapshot?.summary.totalReserved ?? 0;
  const lowStockAlerts = snapshot?.summary.lowStockAlerts ?? [];
  const validationIssues = validation?.issues ?? [];
  const validationWarnings = validation?.warnings ?? [];

  const handleRefresh = () => {
    refetch();
    toast.info("Actualizando disponibilidad operacional...");
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight flex items-center gap-3">
            <Boxes className="h-8 w-8 text-primary" />
            Disponibilidad Operacional
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Inventario derivado en tiempo real · Reservas activas descontadas ·{" "}
            {snapshot
              ? `Calculado ${new Date(snapshot.computedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Cargando..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
            className="h-9"
          >
            {viewMode === "grid"
              ? <><List className="h-4 w-4 mr-1.5" /> Lista</>
              : <><LayoutGrid className="h-4 w-4 mr-1.5" /> Cuadrícula</>
            }
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProjection(v => !v)}
            className="h-9"
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            {showProjection ? "Ocultar" : "Ver"} Proyección
          </Button>
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
            className="h-9"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* ── Overview Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              Disponible
            </p>
            <p className="display-font text-3xl font-bold text-foreground mt-1">
              {isLoading ? "—" : totalAvailable.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              de {totalAnimals.toLocaleString()} totales
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-5">
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Reservado
            </p>
            <p className="display-font text-3xl font-bold text-foreground mt-1">
              {isLoading ? "—" : totalReserved.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {snapshot?.summary.activeReservationCount ?? 0} reservas activas
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-destructive/20 bg-destructive/5",
          lowStockAlerts.length === 0 && "border-green-500/20 bg-green-500/5"
        )}>
          <CardContent className="pt-5">
            <p className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              lowStockAlerts.length > 0
                ? "text-destructive"
                : "text-green-600 dark:text-green-400"
            )}>
              Stock Bajo
            </p>
            <p className="display-font text-3xl font-bold text-foreground mt-1">
              {isLoading ? "—" : lowStockAlerts.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {lowStockAlerts.length === 0 ? "Sin alertas activas" : "clasificaciones en alerta"}
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          validationIssues.length > 0 ? "border-destructive/20 bg-destructive/5" : "border-green-500/20 bg-green-500/5"
        )}>
          <CardContent className="pt-5 flex items-start gap-3">
            <div className={cn(
              "mt-1 p-1.5 rounded-lg",
              validationIssues.length > 0 ? "bg-destructive/10" : "bg-green-500/10"
            )}>
              {validationIssues.length > 0
                ? <AlertTriangle className="h-4 w-4 text-destructive" />
                : <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              }
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Integridad
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {isLoading ? "—" : validationIssues.length === 0 ? "OK" : `${validationIssues.length} errores`}
              </p>
              {validationWarnings.length > 0 && (
                <p className="text-[10px] text-amber-600">
                  {validationWarnings.length} advertencias
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Validation Issues ── */}
      {(validationIssues.length > 0 || validationWarnings.length > 0) && (
        <div className="space-y-2">
          {validationIssues.map((issue, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{issue.message}</p>
            </div>
          ))}
          {validationWarnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
            >
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Classification Availability Cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-32" />
              <div className="space-y-2 mt-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Error al cargar disponibilidad operacional.
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
            Reintentar
          </Button>
        </div>
      ) : Object.keys(statesBySpecies).length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Boxes className="h-12 w-12 text-muted-foreground opacity-30 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-1">Sin inventario clasificado</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Los lotes activos necesitan estar vinculados a clasificaciones de tamaño.
            Ve a <strong>Perfiles de Especies</strong> para configurar y migrar el inventario.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            isFetching ? "opacity-70" : "",
            "transition-opacity",
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              : "space-y-4"
          )}
        >
          {Object.entries(statesBySpecies).map(([profileId, { speciesName, operationalName, states }]) => (
            <AvailabilitySnapshotCard
              key={profileId}
              speciesName={speciesName}
              operationalName={operationalName}
              states={states}
              className={viewMode === "list" ? "max-w-2xl" : ""}
            />
          ))}
        </div>
      )}

      {/* ── Availability Projection Timeline ── */}
      {showProjection && projection && (
        <ProjectionTimeline
          projection={projection}
          daysToShow={14}
        />
      )}

      {/* Info banner */}
      <div className="glass-card border-primary/20 p-4 flex gap-3 items-start">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary font-semibold">Disponibilidad operacional</span> derivada en
          tiempo real de lotes activos (nacimiento + engorda). Las reservas activas se descuentan
          automáticamente sin modificar las cantidades de los lotes.
          La proyección estima disponibilidad futura basándose en la edad de los lotes y la
          progresión por clasificación de tamaño.
        </p>
      </div>
    </div>
  );
}
