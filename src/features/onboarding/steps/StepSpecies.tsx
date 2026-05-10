import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { SPECIES_PLACEHOLDER } from "../lib/onboardingOptions";

export default function StepSpecies() {
  const { animalClass, species, setSpecies } = useOnboardingState();
  const placeholder = animalClass ? SPECIES_PLACEHOLDER[animalClass] : "Especie o raza específica";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Especie o raza específica</h2>
        <p className="text-muted-foreground mt-1">Opcional. Puedes añadirla después desde el panel de tu entorno.</p>
      </div>

      <div className="space-y-2 max-w-md">
        <Label htmlFor="species">Especie / raza</Label>
        <Input
          id="species"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
