import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Check } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { getOperationsFor } from "../lib/onboardingOptions";
import { BLUEPRINT_AVAILABILITY } from "@/modules/hub/blueprintAvailability";
import { ComingSoonBadge } from "../components/ComingSoonBadge";
import { PRELOADED_SPECIES } from "@/modules/bioterio/lib/species-config";

export default function StepOperation() {
  const { 
    purpose, 
    operation, 
    setOperation,
    speciesChoice,
    customSpecies,
    setSpecies,
    setCustomSpeciesText
  } = useOnboardingState();
  
  const allOptions = getOperationsFor(purpose);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold">Selecciona un Modelo Operacional</h2>
        <p className="text-muted-foreground mt-1">Elige el Blueprint que dictará las reglas de tu entorno.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {allOptions.map((opt) => {
          const selected = operation === opt.id;
          const availability = BLUEPRINT_AVAILABILITY[opt.id] || { enabled: false, badge: "Próximamente" };
          const isEnabled = availability.enabled;

          return (
            <div key={opt.id} className={`${selected && opt.id === 'Bioterio' ? 'sm:col-span-2' : ''} transition-all duration-300`}>
              <Card
                role={isEnabled ? "button" : "presentation"}
                tabIndex={isEnabled ? 0 : -1}
                onClick={() => isEnabled && setOperation(opt.id)}
                onKeyDown={(e) => isEnabled && (e.key === "Enter" || e.key === " ") && setOperation(opt.id)}
                className={`relative p-5 transition-all duration-300 border-2 flex flex-col min-h-[160px]
                  ${!isEnabled ? "opacity-60 cursor-not-allowed grayscale-[0.3]" : "cursor-pointer hover:border-primary/50"}
                  ${selected ? "border-primary bg-primary/5 shadow-md" : "border-border"}
                `}
                aria-pressed={selected}
              >
                <div className="flex items-start justify-between mb-2 gap-4">
                  <span className="font-semibold text-lg leading-tight">{opt.name}</span>
                  {selected && <CheckCircle2 className="h-6 w-6 text-primary shrink-0 animate-in zoom-in duration-200" />}
                  {!isEnabled && availability.badge && (
                    <ComingSoonBadge label={availability.badge} className="shrink-0" />
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 flex-grow">
                  {!isEnabled && availability.label ? availability.label : opt.description}
                </p>
                
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3 border-t border-border/50">
                  {opt.modules.map(mod => (
                    <Badge 
                      key={mod} 
                      variant="secondary" 
                      className={`text-[10px] py-0 px-1.5 font-normal ${!isEnabled ? 'bg-muted text-muted-foreground opacity-50' : ''}`}
                    >
                      {mod}
                    </Badge>
                  ))}
                </div>

                {/* Inline Species Selection for Bioterio */}
                {selected && opt.id === 'Bioterio' && (
                  <div className="mt-6 pt-4 border-t border-border/50 animate-in slide-in-from-top-4 fade-in duration-300">
                    <h3 className="text-sm font-semibold mb-3">Selecciona la especie inicial:</h3>
                    <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                      {PRELOADED_SPECIES.map((s) => {
                        const isSpeciesSelected = speciesChoice === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); setSpecies(s.id); }}
                            className={`p-2.5 rounded-md border text-sm cursor-pointer transition-colors flex items-center justify-between gap-2
                              ${isSpeciesSelected ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background hover:border-primary/40 text-muted-foreground'}
                            `}
                          >
                            <span className="truncate">{s.displayName}</span>
                            {isSpeciesSelected && <Check className="h-4 w-4 shrink-0" />}
                          </div>
                        );
                      })}
                      
                      {/* Custom Option */}
                      <div
                        onClick={(e) => { e.stopPropagation(); setSpecies('custom'); }}
                        className={`p-2.5 rounded-md border text-sm cursor-pointer transition-colors flex items-center justify-between gap-2
                          ${speciesChoice === 'custom' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-background hover:border-primary/40 text-muted-foreground'}
                        `}
                      >
                        <span className="truncate">Personalizada</span>
                        {speciesChoice === 'custom' && <Check className="h-4 w-4 shrink-0" />}
                      </div>
                    </div>

                    {speciesChoice === 'custom' && (
                      <div className="mt-4 max-w-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <Label htmlFor="custom-species" className="text-xs mb-1.5 block">Nombre de la especie / raza</Label>
                        <Input
                          id="custom-species"
                          value={customSpecies}
                          onChange={(e) => setCustomSpeciesText(e.target.value)}
                          placeholder="Ej. Gecko Leopardo"
                          autoFocus
                          className="bg-background"
                        />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
