import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { PURPOSE_OPTIONS } from "../lib/onboardingOptions";

export default function StepPurpose() {
  const { purpose, setPurpose } = useOnboardingState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">¿Para qué usarás BioTrack?</h2>
        <p className="text-muted-foreground mt-1">
          Selecciona el propósito de este entorno. Podrás crear más entornos desde el dashboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PURPOSE_OPTIONS.map((opt) => {
          const selected = purpose === opt.value;
          return (
            <Card
              key={opt.value}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => setPurpose(opt.value)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPurpose(opt.value)}
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
    </div>
  );
}
