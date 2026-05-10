import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Plus } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { PURPOSE_OPTIONS } from "../lib/onboardingOptions";
import type { Purpose } from "../lib/types";

export default function StepPurpose() {
  const { purpose, togglePurpose } = useOnboardingState();

  const handleAddAnother = () => {
    const next = PURPOSE_OPTIONS.find((o) => !purpose.includes(o.value));
    if (next) togglePurpose(next.value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">¿Para qué usarás BioTrack?</h2>
        <p className="text-muted-foreground mt-1">Puedes seleccionar uno o más entornos.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PURPOSE_OPTIONS.map((opt) => {
          const selected = purpose.includes(opt.value as Purpose);
          return (
            <Card
              key={opt.value}
              role="button"
              tabIndex={0}
              onClick={() => togglePurpose(opt.value)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && togglePurpose(opt.value)}
              className={`p-4 cursor-pointer transition-colors border-2 ${
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{opt.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                </div>
                {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
              </div>
            </Card>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddAnother}
        disabled={purpose.length >= PURPOSE_OPTIONS.length}
      >
        <Plus className="h-4 w-4" />
        Añadir otro entorno
      </Button>
    </div>
  );
}
