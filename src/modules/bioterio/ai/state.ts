/**
 * Global execution lock for the Operational AI Assistant.
 * Prevents concurrent plan submission/execution within a tab.
 * (Cross-tab safety is enforced by the ai_action_logs row + idempotency checks.)
 */
import { create } from "zustand";
import type { PlanResponse } from "./client";

interface AIAssistantState {
  isPlanning: boolean;
  isExecutingPlan: boolean;
  currentPlan: PlanResponse | null;
  setPlanning: (v: boolean) => void;
  setExecuting: (v: boolean) => void;
  setPlan: (p: PlanResponse | null) => void;
  reset: () => void;
}

export const useAIAssistantStore = create<AIAssistantState>((set) => ({
  isPlanning: false,
  isExecutingPlan: false,
  currentPlan: null,
  setPlanning: (v) => set({ isPlanning: v }),
  setExecuting: (v) => set({ isExecutingPlan: v }),
  setPlan: (p) => set({ currentPlan: p }),
  reset: () => set({ isPlanning: false, isExecutingPlan: false, currentPlan: null }),
}));
