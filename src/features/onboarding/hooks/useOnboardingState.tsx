import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AnimalClass, Purpose, Subtype, WizardStep, WorkspaceDraft } from "../lib/types";
import { requiresSubtype } from "../lib/onboardingOptions";

export const PENDING_WORKSPACE_KEY = "biotrack_pending_workspace";

interface OnboardingState {
  currentStep: WizardStep;
  purpose: Purpose | null;
  subtype: Subtype | null;
  animalClass: AnimalClass | null;
  species: string;
}

const initial: OnboardingState = {
  currentStep: 1,
  purpose: null,
  subtype: null,
  animalClass: null,
  species: "",
};

interface OnboardingContextValue extends OnboardingState {
  setPurpose: (p: Purpose) => void;
  setSubtype: (s: Subtype) => void;
  setAnimalClass: (a: AnimalClass) => void;
  setSpecies: (s: string) => void;
  goTo: (step: WizardStep) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  canAdvance: boolean;
  totalSteps: number;
  progressIndex: number;
  buildDraft: () => WorkspaceDraft;
  confirm: () => WorkspaceDraft;
}

const Ctx = createContext<OnboardingContextValue | null>(null);

function getOrder(purpose: Purpose | null): WizardStep[] {
  return requiresSubtype(purpose) ? [1, 2, 3, 4, "summary"] : [1, 3, 4, "summary"];
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initial);

  const totalSteps = requiresSubtype(state.purpose) ? 4 : 3;

  const stepOrder = useMemo(() => getOrder(state.purpose), [state.purpose]);
  const progressIndex = Math.max(0, stepOrder.indexOf(state.currentStep));

  const canAdvance = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return state.purpose !== null;
      case 2:
        return !!state.subtype;
      case 3:
        return !!state.animalClass;
      case 4:
        return true;
      case "summary":
        return true;
    }
  }, [state]);

  const setPurpose = useCallback((purpose: Purpose) => {
    setState((s) => ({
      ...s,
      purpose,
      subtype: requiresSubtype(purpose) ? s.subtype : null,
    }));
  }, []);

  const setSubtype = useCallback((subtype: Subtype) => setState((s) => ({ ...s, subtype })), []);
  const setAnimalClass = useCallback((animalClass: AnimalClass) => setState((s) => ({ ...s, animalClass })), []);
  const setSpecies = useCallback((species: string) => setState((s) => ({ ...s, species })), []);

  const goTo = useCallback((step: WizardStep) => setState((s) => ({ ...s, currentStep: step })), []);

  const next = useCallback(() => {
    setState((s) => {
      const order = getOrder(s.purpose);
      const i = order.indexOf(s.currentStep);
      const nextStep = i >= 0 && i < order.length - 1 ? order[i + 1] : s.currentStep;
      return { ...s, currentStep: nextStep };
    });
  }, []);

  const back = useCallback(() => {
    setState((s) => {
      const order = getOrder(s.purpose);
      const i = order.indexOf(s.currentStep);
      const prev = i > 0 ? order[i - 1] : s.currentStep;
      return { ...s, currentStep: prev };
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(PENDING_WORKSPACE_KEY);
    setState(initial);
  }, []);

  const buildDraft = useCallback((): WorkspaceDraft => {
    return {
      purpose: state.purpose!,
      subtype: requiresSubtype(state.purpose) ? state.subtype : null,
      animalClass: state.animalClass!,
      species: state.species.trim() ? state.species.trim() : null,
      name: `Entorno ${new Date().toISOString()}`,
    };
  }, [state]);

  const confirm = useCallback((): WorkspaceDraft => {
    const draft = buildDraft();
    localStorage.setItem(PENDING_WORKSPACE_KEY, JSON.stringify(draft));
    return draft;
  }, [buildDraft]);

  const value: OnboardingContextValue = {
    ...state,
    setPurpose,
    setSubtype,
    setAnimalClass,
    setSpecies,
    goTo,
    next,
    back,
    reset,
    canAdvance,
    totalSteps,
    progressIndex,
    buildDraft,
    confirm,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboardingState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingState must be used inside OnboardingProvider");
  return ctx;
}
