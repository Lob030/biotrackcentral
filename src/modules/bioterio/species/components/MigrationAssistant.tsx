/**
 * Migration Assistant Component
 * 
 * Helps users map legacy inventory data to new workspace species size classes.
 */

import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnclassifiedLots, useMigrateLots } from "../data/index";
import type { SpeciesSizeClass } from "../runtime/types";
import { toast } from "sonner";

interface MigrationAssistantProps {
  speciesName: string;
  sizeClasses: SpeciesSizeClass[];
}

export function MigrationAssistant({ speciesName, sizeClasses }: MigrationAssistantProps) {
  const { data: unclassifiedLots = [], isLoading } = useUnclassifiedLots(speciesName);
  const migrateMutation = useMigrateLots({
    onSuccess: () => {
      toast.success("Migración completada exitosamente");
    }
  });

  const [selectedSizeClassId, setSelectedSizeClassId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (unclassifiedLots.length === 0) {
    return (
      <div className="rounded-lg border bg-success/5 border-success/20 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
        <h4 className="text-base font-semibold text-foreground">Inventario Sincronizado</h4>
        <p className="text-sm text-muted-foreground">
          Todos los lotes de {speciesName} están correctamente vinculados a clasificaciones operacionales.
        </p>
      </div>
    );
  }

  const handleMigrate = () => {
    if (!selectedSizeClassId) return;
    
    const sizeClass = sizeClasses.find(sc => sc.id === selectedSizeClassId);
    if (!sizeClass) return;

    migrateMutation.mutate({
      lotIds: unclassifiedLots.map(l => l.id),
      sizeClassId: selectedSizeClassId,
      sizeClassName: sizeClass.name,
    });
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-amber-100 p-2 rounded-full">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-amber-900">
            Asistente de Migración de Inventario
          </h4>
          <p className="text-sm text-amber-800/80">
            Hemos detectado <strong className="text-amber-900">{unclassifiedLots.length} lotes</strong> de {speciesName} que no están vinculados a ninguna clasificación operacional.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white/50 rounded-lg border border-amber-200/50 p-4">
          <p className="text-xs font-medium text-amber-900 uppercase tracking-wider mb-3">
            Acción Masiva
          </p>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-semibold text-amber-800 uppercase mb-1.5 block">
                Vincular todos a:
              </label>
              <Select value={selectedSizeClassId || ""} onValueChange={setSelectedSizeClassId}>
                <SelectTrigger className="bg-white border-amber-200 focus:ring-amber-500 h-10">
                  <SelectValue placeholder="Seleccionar clasificación..." />
                </SelectTrigger>
                <SelectContent>
                  {sizeClasses.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.name} {sc.isDefault ? "(Predeterminado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleMigrate} 
              disabled={!selectedSizeClassId || migrateMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm h-10 px-6"
            >
              {migrateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Aplicar a {unclassifiedLots.length} lotes
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-700/70 italic">
          <p>
            Esto actualizará la clasificación actual y futura de estos lotes en todos los reportes y pantallas de venta.
          </p>
        </div>
      </div>
    </div>
  );
}
