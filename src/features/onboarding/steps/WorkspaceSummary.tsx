import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { PURPOSE_OPTIONS, requiresSubtype } from "../lib/onboardingOptions";

interface Props {
  onConfirm: () => void;
}

export default function WorkspaceSummary({ onConfirm }: Props) {
  const { purpose, subtype, animalClass, goTo, buildDraft, isSubmitting } = useOnboardingState();
  const draft = buildDraft();
  const purposeLabel = PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label ?? "—";
  const speciesLabel = draft.species ?? "No especificada";

  const Row = ({ label, value, step }: { label: string; value: string; step: 1 | 2 | 3 | 4 }) => (
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
        <h2 className="text-2xl font-semibold">Confirma tu entorno</h2>
        <p className="text-muted-foreground mt-1">Revisa los datos antes de entrar al dashboard.</p>
      </div>

      <Card className="p-4 divide-y">
        <Row label="Propósito" value={purposeLabel} step={1} />
        {requiresSubtype(purpose) && <Row label="Tipo de gestión" value={subtype ?? "—"} step={2} />}
        <Row label="Clase animal" value={animalClass ?? "—"} step={3} />
        <Row label="Especie / raza" value={speciesLabel} step={4} />
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
