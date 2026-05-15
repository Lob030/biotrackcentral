import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AnimalClass, Purpose, OperationType, SpeciesSeed, WizardStep, WorkspaceDraft } from "../lib/types";
import { requiresOperation } from "../lib/onboardingOptions";
import { ACTIVE_WORKSPACE_KEY, createWorkspaceFromDraft, type WorkspaceRow } from "@/lib/workspace";

export const PENDING_WORKSPACE_KEY = "biotrack_pending_workspace";

interface OnboardingState {
  currentStep: WizardStep;
  purpose: Purpose | null;
  operation: OperationType | null;
  animalClass: AnimalClass | null;
  speciesSeed: SpeciesSeed | null;
  customSpeciesText: string;
}

const initial: OnboardingState = {
  currentStep: 1,
  purpose: null,
  operation: null,
  animalClass: null,
  speciesSeed: null,
  customSpeciesText: "",
};

interface OnboardingContextValue extends OnboardingState {
  setPurpose: (p: Purpose) => void;
  setOperation: (s: OperationType) => void;
  setAnimalClass: (a: AnimalClass) => void;
  selectBlueprintSpecies: (taxonomyKey: string, displayName: string) => void;
  selectCustomSpecies: (displayName: string) => void;
  goTo: (step: WizardStep) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  canAdvance: boolean;
  totalSteps: number;
  progressIndex: number;
  buildDraft: () => WorkspaceDraft;
  confirm: () => Promise<WorkspaceRow>;
  isSubmitting: boolean;
}

const Ctx = createContext<OnboardingContextValue | null>(null);

function getOrder(purpose: Purpose | null): WizardStep[] {
  return requiresOperation(purpose) ? [1, 2, "summary"] : [1, "summary"];
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = requiresOperation(state.purpose) ? 2 : 1;
  const stepOrder = useMemo(() => getOrder(state.purpose), [state.purpose]);
  const progressIndex = Math.max(0, stepOrder.indexOf(state.currentStep));

  const canAdvance = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return state.purpose !== null;
      case 2:
        if (!state.operation) return false;
        if (state.operation === "Bioterio") {
          if (!state.speciesSeed) return false;
          if (state.speciesSeed.kind === "custom") {
            return state.speciesSeed.displayName.trim().length > 0;
          }
          return true;
        }
        return true;
      case "summary":
        return true;
    }
  }, [state]);

  const setPurpose = useCallback((purpose: Purpose) => {
    setState((s) => ({
      ...s,
      purpose,
      operation: requiresOperation(purpose) ? s.operation : null,
    }));
  }, []);

  const setOperation = useCallback(
    (operation: OperationType) => setState((s) => ({ ...s, operation })),
    [],
  );
  const setAnimalClass = useCallback(
    (animalClass: AnimalClass) => setState((s) => ({ ...s, animalClass })),
    [],
  );

  const selectBlueprintSpecies = useCallback(
    (taxonomyKey: string, displayName: string) => {
      setState((s) => ({
        ...s,
        speciesSeed: { kind: "blueprint", taxonomyKey, displayName },
        customSpeciesText: "",
      }));
    },
    [],
  );

  const selectCustomSpecies = useCallback((displayName: string) => {
    setState((s) => ({
      ...s,
      customSpeciesText: displayName,
      speciesSeed: { kind: "custom", displayName: displayName.trim() },
    }));
  }, []);

  const goTo = useCallback(
    (step: WizardStep) => setState((s) => ({ ...s, currentStep: step })),
    [],
  );

  const next = useCallback(() => {
    setState((s) => {
      const order = getOrder(s.purpose);
      const i = order.indexOf(s.currentStep);
      return { ...s, currentStep: i >= 0 && i < order.length - 1 ? order[i + 1] : s.currentStep };
    });
  }, []);

  const back = useCallback(() => {
    setState((s) => {
      const order = getOrder(s.purpose);
      const i = order.indexOf(s.currentStep);
      return { ...s, currentStep: i > 0 ? order[i - 1] : s.currentStep };
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(PENDING_WORKSPACE_KEY);
    setState(initial);
  }, []);

  const buildDraft = useCallback((): WorkspaceDraft => {
    let animalClass: AnimalClass = "Mamíferos";
    if (state.speciesSeed?.kind === "blueprint" && state.speciesSeed.taxonomyKey === "tenebrios") {
      animalClass = "Artrópodos";
    }
    return {
      purpose: state.purpose!,
      operation: requiresOperation(state.purpose) ? state.operation : null,
      animalClass,
      speciesSeed: state.speciesSeed,
      name: `Entorno ${new Date().toISOString()}`,
    };
  }, [state]);

  const confirm = useCallback(async (): Promise<WorkspaceRow> => {
    const draft = buildDraft();
    localStorage.setItem(PENDING_WORKSPACE_KEY, JSON.stringify(draft));
    setIsSubmitting(true);
    try {
      const ws = await createWorkspaceFromDraft(draft);
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, ws.id);
      localStorage.removeItem(PENDING_WORKSPACE_KEY);
      return ws;
    } finally {
      setIsSubmitting(false);
    }
  }, [buildDraft]);

  const value: OnboardingContextValue = {
    ...state,
    setPurpose,
    setOperation,
    setAnimalClass,
    selectBlueprintSpecies,
    selectCustomSpecies,
    goTo,
    next,
    back,
    reset,
    canAdvance,
    totalSteps,
    progressIndex,
    buildDraft,
    confirm,
    isSubmitting,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboardingState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingState must be used inside OnboardingProvider");
  return ctx;
}
