import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AnimalClass, Purpose, Subtype, WizardStep, WorkspaceDraft } from "../lib/types";
import { requiresSubtype } from "../lib/onboardingOptions";

const PROGRESS_KEY = "biotrack_onboarding_progress";
export const PENDING_WORKSPACE_KEY = "biotrack_pending_workspace";

interface OnboardingState {
  currentStep: WizardStep;
  purpose: Purpose[];
  subtype: Subtype | null;
  animalClass: AnimalClass | null;
  species: string;
}

const initial: OnboardingState = {
  currentStep: 1,
  purpose: [],
  subtype: null,
  animalClass: null,
  species: "",
};

interface OnboardingContextValue extends OnboardingState {
  togglePurpose: (p: Purpose) => void;
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

function loadInitial(): OnboardingState {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
  return initial;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(loadInitial);

  useEffect(() => {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  }, [state]);

  const totalSteps = requiresSubtype(state.purpose) ? 4 : 3;

  const stepOrder: WizardStep[] = useMemo(() => {
    const base: WizardStep[] = [1];
    if (requiresSubtype(state.purpose)) base.push(2);
    base.push(3, 4, "summary");
    return base;
  }, [state.purpose]);

  const progressIndex = Math.max(0, stepOrder.indexOf(state.currentStep));

  const canAdvance = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return state.purpose.length > 0;
      case 2:
        return !!state.subtype;
      case 3:
        return !!state.animalClass;
      case 4:
        return true; // opcional
      case "summary":
        return true;
    }
  }, [state]);

  const togglePurpose = useCallback((p: Purpose) => {
    setState((s) => {
      const has = s.purpose.includes(p);
      const purpose = has ? s.purpose.filter((x) => x !== p) : [...s.purpose, p];
      const subtype = requiresSubtype(purpose) ? s.subtype : null;
      return { ...s, purpose, subtype };
    });
  }, []);

  const setSubtype = useCallback((subtype: Subtype) => setState((s) => ({ ...s, subtype })), []);
  const setAnimalClass = useCallback((animalClass: AnimalClass) => setState((s) => ({ ...s, animalClass })), []);
  const setSpecies = useCallback((species: string) => setState((s) => ({ ...s, species })), []);

  const goTo = useCallback((step: WizardStep) => setState((s) => ({ ...s, currentStep: step })), []);

  const next = useCallback(() => {
    setState((s) => {
      const order: WizardStep[] = requiresSubtype(s.purpose) ? [1, 2, 3, 4, "summary"] : [1, 3, 4, "summary"];
      const i = order.indexOf(s.currentStep);
      const nextStep = i >= 0 && i < order.length - 1 ? order[i + 1] : s.currentStep;
      return { ...s, currentStep: nextStep };
    });
  }, []);

  const back = useCallback(() => {
    setState((s) => {
      const order: WizardStep[] = requiresSubtype(s.purpose) ? [1, 2, 3, 4, "summary"] : [1, 3, 4, "summary"];
      const i = order.indexOf(s.currentStep);
      const prev = i > 0 ? order[i - 1] : s.currentStep;
      return { ...s, currentStep: prev };
    });
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(PROGRESS_KEY);
    setState(initial);
  }, []);

  const buildDraft = useCallback((): WorkspaceDraft => {
    return {
      purpose: state.purpose,
      subtype: requiresSubtype(state.purpose) ? state.subtype : null,
      animalClass: state.animalClass!,
      species: state.species.trim() ? state.species.trim() : null,
      name: `Entorno ${new Date().toISOString()}`,
    };
  }, [state]);

  const confirm = useCallback((): WorkspaceDraft => {
    const draft = buildDraft();
    localStorage.setItem(PENDING_WORKSPACE_KEY, JSON.stringify(draft));
    sessionStorage.removeItem(PROGRESS_KEY);
    return draft;
  }, [buildDraft]);

  const value: OnboardingContextValue = {
    ...state,
    togglePurpose,
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
