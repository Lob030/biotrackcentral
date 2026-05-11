import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { OnboardingProvider, useOnboardingState } from "./hooks/useOnboardingState";
import StepPurpose from "./steps/StepPurpose";
import StepSubtype from "./steps/StepSubtype";
import StepAnimalClass from "./steps/StepAnimalClass";
import StepSpecies from "./steps/StepSpecies";
import WorkspaceSummary from "./steps/WorkspaceSummary";

function WizardInner() {
  const navigate = useNavigate();
  const { currentStep, next, back, canAdvance, totalSteps, progressIndex, confirm } = useOnboardingState();

  const handleConfirm = () => {
    confirm();
    navigate("/dashboard?onboarding_complete=true", { replace: true });
  };

  const isFirst = currentStep === 1;
  const isSummary = currentStep === "summary";
  const progressPct = Math.min(100, Math.round(((progressIndex + 1) / (totalSteps + 1)) * 100));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Configuración inicial</span>
            <span>
              Paso {Math.min(progressIndex + 1, totalSteps + 1)} de {totalSteps + 1}
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <div>
          {currentStep === 1 && <StepPurpose />}
          {currentStep === 2 && <StepSubtype />}
          {currentStep === 3 && <StepAnimalClass />}
          {currentStep === 4 && <StepSpecies />}
          {currentStep === "summary" && <WorkspaceSummary onConfirm={handleConfirm} />}
        </div>

        {!isSummary && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="ghost" onClick={back} disabled={isFirst}>
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </Button>
            <Button onClick={next} disabled={!canAdvance}>
              {currentStep === 4 ? "Revisar resumen" : "Continuar"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function OnboardingWizard() {
  return (
    <OnboardingProvider>
      <WizardInner />
    </OnboardingProvider>
  );
}
