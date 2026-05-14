/**
 * Species Profile Card Component
 * 
 * Displays an operational overview card for a species profile.
 * Shows active size classes, breeding cycle, weaning age, inventory counts, and estimated value.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Egg, Scale, Package, TrendingUp } from "lucide-react";
import type { WorkspaceSpeciesProfile, SpeciesSizeClass, SpeciesOperationalSettings } from "../runtime/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SpeciesProfileCardProps {
  profile: WorkspaceSpeciesProfile;
  sizeClasses?: SpeciesSizeClass[];
  settings?: SpeciesOperationalSettings | null;
  inventoryCount?: number;
  estimatedValue?: number;
  className?: string;
}

export function SpeciesProfileCard({
  profile,
  sizeClasses = [],
  settings,
  inventoryCount = 0,
  estimatedValue = 0,
  className,
}: SpeciesProfileCardProps) {
  const activeSizeClasses = useMemo(() => {
    return sizeClasses.filter((sc) => sc.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  }, [sizeClasses]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CU", {
      style: "currency",
      currency: "CUP",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Link
      to={`/bioterio/species/${profile.id}`}
      className={cn(
        "group block rounded-xl border bg-card p-5 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-primary/30 hover:bg-accent/30",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground truncate">{profile.speciesName}</h3>
            {profile.isStarterBlueprint && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                Blueprint
              </Badge>
            )}
            {profile.isCustom && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                Custom
              </Badge>
            )}
          </div>
          {profile.operationalName !== profile.speciesName && (
            <p className="text-xs text-muted-foreground truncate">
              {profile.operationalName}
            </p>
          )}
          {profile.scientificName && (
            <p className="text-[10px] text-muted-foreground italic truncate">
              {profile.scientificName}
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Breeding Cycle */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Egg className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Ciclo Cría
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {settings?.breedingCycleDays ?? "-"}d
          </p>
        </div>

        {/* Weaning Age */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Destete
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {settings?.expectedWeaningAgeDays ?? "-"}d
          </p>
        </div>

        {/* Active Size Classes */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Clasificaciones
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {activeSizeClasses.length}
          </p>
        </div>

        {/* Inventory Count */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Inventario
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {inventoryCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Size Class Preview */}
      {activeSizeClasses.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Clasificaciones Activas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeSizeClasses.slice(0, 5).map((sc) => (
              <Badge
                key={sc.id}
                variant="outline"
                className="text-[10px] px-2 py-0.5 h-6 font-medium"
              >
                {sc.name}
                {sc.salePrice && (
                  <span className="ml-1 text-muted-foreground">
                    ${sc.salePrice.toFixed(2)}
                  </span>
                )}
              </Badge>
            ))}
            {activeSizeClasses.length > 5 && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-6">
                +{activeSizeClasses.length - 5} más
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Estimated Value */}
      {estimatedValue > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Valor Operativo Estimado
          </p>
          <p className="text-xl font-bold text-primary">
            {formatCurrency(estimatedValue)}
          </p>
        </div>
      )}

      {!profile.isActive && (
        <div className="mt-3 pt-3 border-t border-border">
          <Badge variant="destructive" className="text-[10px] px-2 py-0.5 h-5">
            Inactivo
          </Badge>
        </div>
      )}
    </Link>
  );
}
