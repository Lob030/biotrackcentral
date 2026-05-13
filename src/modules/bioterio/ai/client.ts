/**
 * Client for the operational AI assistant.
 * Calls the ai-plan edge function and returns a single OperationalPlan.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Confidence, IntentName, PlanStatus } from "./intents";

export interface PlannedOperation {
  id: string;
  intent: IntentName;
  args: Record<string, unknown>;
  confidence: Confidence;
  preview: PreviewSnapshot;
  warnings: string[];
  validationErrors: string[];
}

export interface PreviewSnapshot {
  /** Human-readable lines like "Lot ASF-22 quantity: 40 → 35". */
  lines: string[];
  affectedLots: Array<{ id: string; code: string; currentQuantity: number; resultingQuantity?: number }>;
  affectedCages: Array<{
    id: string;
    code: string;
    capacity: number;
    currentOccupancy: number;
    resultingOccupancy?: number;
  }>;
}

export interface DisambiguationCandidate {
  field: string;
  options: Array<{ id: string; label: string; hint?: string }>;
}

export interface PlanResponse {
  planId: string;
  status: PlanStatus;
  operation?: PlannedOperation;
  candidates?: DisambiguationCandidate[];
  reason?: string;
}

export async function planAction(prompt: string, workspaceId: string): Promise<PlanResponse> {
  const { data, error } = await supabase.functions.invoke("ai-plan", {
    body: { prompt, workspace_id: workspaceId },
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empty response from ai-plan");
  if ((data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as PlanResponse;
}

export async function logExecutionResult(
  planId: string,
  payload: {
    executionStatus: "executed" | "failed" | "cancelled" | "invalid";
    executionDurationMs: number;
    result?: unknown;
    validationErrors?: string[];
  },
): Promise<void> {
  await supabase
    .from("ai_action_logs")
    .update({
      status: payload.executionStatus === "executed" ? "executed" : payload.executionStatus,
      result: {
        executionStatus: payload.executionStatus,
        executionDurationMs: payload.executionDurationMs,
        validationErrors: payload.validationErrors ?? [],
        result: payload.result ?? null,
      },
    })
    .eq("id", planId);
}
