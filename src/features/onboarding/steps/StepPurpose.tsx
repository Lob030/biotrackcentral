import { Card } from "@/components/ui/card";
import { CheckCircle2, Building2, PawPrint, Stethoscope } from "lucide-react";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { PURPOSE_OPTIONS } from "../lib/onboardingOptions";
import { PURPOSE_AVAILABILITY } from "@/modules/hub/blueprintAvailability";
import { ComingSoonBadge } from "../components/ComingSoonBadge";

export default function StepPurpose() {
  const { purpose, setPurpose } = useOnboardingState();

  const getIcon = (val: string) => {
    switch (val) {
      case "business": return <Building2 className="h-6 w-6" />;
      case "pet": return <PawPrint className="h-6 w-6" />;
      case "vet": return <Stethoscope className="h-6 w-6" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">Bienvenido a BioTrack Central</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Selecciona una opción para comenzar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PURPOSE_OPTIONS.map((opt) => {
          const isSelected = purpose === opt.value;
          const availability = PURPOSE_AVAILABILITY[opt.value] || { enabled: false, badge: "Próximamente" };
          const isEnabled = availability.enabled;

          return (
            <Card
              key={opt.value}
              className={`relative overflow-hidden transition-all duration-200 min-h-[220px] flex flex-col
                ${!isEnabled ? 'opacity-60 cursor-not-allowed grayscale-[0.3]' : 'cursor-pointer hover:border-primary/50 hover:shadow-md'}
                ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}
              `}
              onClick={() => isEnabled && setPurpose(opt.value)}
              onKeyDown={(e) => isEnabled && (e.key === "Enter" || e.key === " ") && setPurpose(opt.value)}
              role={isEnabled ? "button" : "presentation"}
              tabIndex={isEnabled ? 0 : -1}
              aria-pressed={isSelected}
            >
              <div className="p-6 h-full flex flex-col items-center text-center gap-4">
                <div className={`p-4 rounded-full ${isSelected ? 'bg-primary/20 text-primary' : (isEnabled ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground')}`}>
                  {getIcon(opt.value)}
                </div>
                
                <div>
                  <h3 className="font-semibold text-xl">{opt.label}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {!isEnabled && availability.label ? availability.label : opt.description}
                  </p>
                </div>
                
                {!isEnabled && availability.badge && (
                  <div className="mt-auto pt-4">
                    <ComingSoonBadge label={availability.badge} />
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-4 right-4 text-primary animate-in zoom-in duration-200">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
