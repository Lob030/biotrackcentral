import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { SPECIES_PLACEHOLDER } from "../lib/onboardingOptions";
import { PRELOADED_SPECIES } from "@/lib/species-config";

export default function StepSpecies() {
  const { purpose, subtype, animalClass, speciesChoice, customSpecies, setSpecies, setCustomSpeciesText } = useOnboardingState();

  const showProductionSpecies =
    purpose === "business" &&
    subtype === "Granja/Bioterio" &&
    animalClass === "Mamíferos";

  const placeholder = animalClass ? SPECIES_PLACEHOLDER[animalClass] : "Especie o raza específica";

  useEffect(() => {
    if (!showProductionSpecies && speciesChoice !== null && speciesChoice !== "custom") {
      setSpecies("custom");
    }
  }, [showProductionSpecies, speciesChoice, setSpecies]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Especie o raza específica</h2>
        <p className="text-muted-foreground mt-1">
          {showProductionSpecies
            ? "Opcional. Selecciona una de las especies precargadas o ingresa la tuya. Puedes cambiarla después."
            : "Opcional. Ingresa la especie o raza con la que trabajas. Puedes cambiarla después."}
        </p>
      </div>

      {showProductionSpecies && (
        <div className="grid gap-3 sm:grid-cols-2">
          {PRELOADED_SPECIES.map((s) => {
            const selected = speciesChoice === s.id;
            return (
              <Card
                key={s.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => setSpecies(s.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSpecies(s.id)}
                className={`p-4 cursor-pointer transition-colors border-2 ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{s.displayName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {s.etapas} etapas · Desde ${s.precioBase.toFixed(0)}
                    </p>
                  </div>
                  {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
                </div>
              </Card>
            );
          })}

          {(() => {
            const selected = speciesChoice === "custom";
            return (
              <Card
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => setSpecies("custom")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSpecies("custom")}
                className={`p-4 cursor-pointer transition-colors border-2 ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">📝 Otra especie personalizada</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Define tu propia especie o raza.
                    </p>
                  </div>
                  {selected && <Check className="h-5 w-5 text-primary shrink-0" />}
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {(speciesChoice === "custom" || !showProductionSpecies) && (
        <div className="space-y-2 max-w-md">
          <Label htmlFor="custom-species">Especie / raza</Label>
          <Input
            id="custom-species"
            value={customSpecies}
            onChange={(e) => setCustomSpeciesText(e.target.value)}
            placeholder={placeholder}
            autoFocus={!showProductionSpecies}
          />
        </div>
      )}
    </div>
  );
}
