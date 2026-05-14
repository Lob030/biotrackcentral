import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { PURPOSE_OPTIONS, requiresOperation, OPERATIONAL_BLUEPRINTS } from "../lib/onboardingOptions";

interface Props {
  onConfirm: () => void;
}

export default function WorkspaceSummary({ onConfirm }: Props) {
  const { purpose, operation, goTo, buildDraft, isSubmitting } = useOnboardingState();
  const draft = buildDraft();
  const purposeLabel = PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label ?? "—";
  const speciesLabel = draft.species ?? "No especificada";
  
  const blueprint = OPERATIONAL_BLUEPRINTS.find(bp => bp.id === operation);
  const operationName = blueprint?.name ?? "—";
  const modulesList = blueprint?.modules.join(", ") ?? "—";

  const Row = ({ label, value, step }: { label: string; value: string; step: 1 | 2 }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium mt-0.5">{value}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => goTo(step)}>
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Inicialización Operacional</h2>
        <p className="text-muted-foreground mt-1">Revisa la configuración de tu entorno operacional antes de crearlo.</p>
      </div>

      <Card className="p-4 divide-y">
        <Row label="Contexto" value={purposeLabel} step={1} />
        {requiresOperation(purpose) && <Row label="Operación" value={operationName} step={2} />}
        <Row label="Species Runtime" value={speciesLabel} step={2} />
        {requiresOperation(purpose) && (
          <div className="py-3 border-b">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Módulos habilitados</p>
            <p className="font-medium mt-0.5 text-sm">{modulesList}</p>
          </div>
        )}
        <div className="py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Nombre del entorno</p>
          <p className="font-medium mt-0.5 text-sm break-all">{draft.name}</p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onConfirm} size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Creando entorno…" : "Confirmar y entrar al Dashboard"}
        </Button>
      </div>
    </div>
  );
}
