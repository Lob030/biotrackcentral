import { supabase } from "@/integrations/supabase/client";

// ───────── Legacy single-intent types (kept for compatibility) ─────────
export interface ParsedIntent {
  ok: true;
  intent: string;
  confidence: number;
  payload: Record<string, unknown>;
  requires_confirmation: boolean;
  explanation?: {
    understood: string;
    entities_resolved?: string[];
    assumptions_made?: string[];
  };
}
export interface ExecuteResult {
  ok: true;
  summary: string;
  affected: Record<string, unknown>;
}

// ───────── Multi-operation (batch) types ─────────
export interface ParsedOperation {
  id: string;
  intent: string;
  confidence: number;
  payload: Record<string, unknown>;
  source_text?: string;
  requires_confirmation: true;
  explanation?: {
    understood: string;
    entities_resolved?: string[];
    assumptions_made?: string[];
  };
}
export interface InvalidOperation {
  id: string;
  intent?: string;
  error: string;
  source_text?: string;
}
export interface BatchParseResult {
  ok: true;
  operations: ParsedOperation[];
  invalid: InvalidOperation[];
  note: string;
}
export type OperationExecutionResult =
  | { id: string; intent: string; status: "ok"; summary: string; affected: Record<string, unknown> }
  | { id: string; intent?: string; status: "error"; error: string };
export interface BatchExecuteResult {
  ok: true;
  results: OperationExecutionResult[];
  summary: string;
}

async function call(action: "parse" | "execute" | "execute_batch", body: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Sesión expirada");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-command?action=${action}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || `Error ${resp.status}`);
  return data;
}

// Batch API (primary path)
export const parseBatch = (text: string) => call("parse", { text }) as Promise<BatchParseResult>;
export const executeBatch = (note: string, operations: ParsedOperation[]) =>
  call("execute_batch", { note, operations }) as Promise<BatchExecuteResult>;

// Telemetry API
export const sendAITelemetry = (event_type: string, duration_ms?: number, metadata?: Record<string, unknown>) =>
  call("telemetry", { event_type, duration_ms, metadata }).catch(() => {}); // Fire and forget

// Legacy wrappers (still supported by edge function)
export const parseCommand = async (text: string): Promise<ParsedIntent> => {
  const r = await parseBatch(text);
  const first = r.operations[0];
  if (!first) throw new Error(r.invalid[0]?.error ?? "Sin operaciones detectadas");
  return {
    ok: true,
    intent: first.intent,
    confidence: first.confidence,
    payload: first.payload,
    requires_confirmation: true,
    explanation: first.explanation,
  };
};
export const executeCommand = (intent: { intent: string; confidence: number; payload: Record<string, unknown> }) =>
  call("execute", intent) as Promise<ExecuteResult>;

export const INTENT_LABELS: Record<string, string> = {
  crear_linea_genetica: "Crear línea genética",
  editar_linea_genetica: "Editar línea genética",
  crear_caja: "Crear cajas",
  editar_caja: "Editar caja",
  crear_lote: "Crear lote",
  editar_lote: "Editar lote",
  registrar_mortalidad: "Registrar mortalidad",
  trasladar_animales: "Trasladar animales",
  dividir_lote: "Dividir lote",
  requires_clarification: "Falta Información (Aclaración requerida)",
};

export const DESTRUCTIVE_INTENTS = new Set([
  "registrar_mortalidad",
  "dividir_lote",
  "editar_lote",
  "trasladar_animales",
]);
