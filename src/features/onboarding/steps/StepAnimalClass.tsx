import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { ANIMAL_CLASS_OPTIONS } from "../lib/onboardingOptions";

export default function StepAnimalClass() {
  const { animalClass, setAnimalClass } = useOnboardingState();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">¿Qué clase de animales?</h2>
        <p className="text-muted-foreground mt-1">Selecciona la clase principal con la que trabajarás.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ANIMAL_CLASS_OPTIONS.map((opt) => {
          const selected = animalClass === opt;
          return (
            <Card
              key={opt}
              role="button"
              tabIndex={0}
              onClick={() => setAnimalClass(opt)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAnimalClass(opt)}
              className={`p-4 cursor-pointer transition-colors border-2 ${
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{opt}</span>
                {selected && <Check className="h-5 w-5 text-primary" />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
