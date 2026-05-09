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

async function call(
  action: "parse" | "execute" | "execute_batch" | "telemetry",
  body: unknown,
) {
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

// Telemetry — fire-and-forget. Never throws.
export const sendAITelemetry = (
  event_type: string,
  duration_ms?: number,
  metadata?: Record<string, unknown>,
) =>
  call("telemetry", { event_type, duration_ms, metadata }).catch((e) => {
    if (typeof console !== "undefined") console.debug("telemetry failed", e);
  });

export const CLARIFICATION_INTENT = "requires_clarification";
export const isClarification = (intent: string) => intent === CLARIFICATION_INTENT;

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
  crear_cliente: "Crear cliente",
  editar_cliente: "Editar cliente",
  crear_pedido: "Crear pedido",
  editar_pedido: "Editar pedido",
  requires_clarification: "Falta Información (Aclaración requerida)",
};

export const INTENT_MODULE: Record<string, string> = {
  crear_linea_genetica: "Líneas genéticas",
  editar_linea_genetica: "Líneas genéticas",
  crear_caja: "Cajas",
  editar_caja: "Cajas",
  crear_lote: "Lotes",
  editar_lote: "Lotes",
  registrar_mortalidad: "Lotes",
  trasladar_animales: "Lotes",
  dividir_lote: "Lotes",
  crear_cliente: "Clientes",
  editar_cliente: "Clientes",
  crear_pedido: "Pedidos",
  editar_pedido: "Pedidos",
  requires_clarification: "Aclaración",
};

export const DESTRUCTIVE_INTENTS = new Set([
  "registrar_mortalidad",
  "dividir_lote",
  "editar_lote",
  "trasladar_animales",
]);
