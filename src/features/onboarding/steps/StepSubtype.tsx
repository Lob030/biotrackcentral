import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { getSubtypesFor } from "../lib/onboardingOptions";

export default function StepSubtype() {
  const { purpose, subtype, setSubtype } = useOnboardingState();
  const options = getSubtypesFor(purpose);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">¿Qué tipo de gestión?</h2>
        <p className="text-muted-foreground mt-1">Elige el rubro que mejor describe tu operación.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = subtype === opt;
          return (
            <Card
              key={opt}
              role="button"
              tabIndex={0}
              onClick={() => setSubtype(opt)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSubtype(opt)}
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
