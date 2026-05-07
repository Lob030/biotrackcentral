import { supabase } from "@/integrations/supabase/client";

export interface ParsedIntent {
  ok: true;
  intent: string;
  confidence: number;
  payload: Record<string, unknown>;
  requires_confirmation: boolean;
}

export interface ExecuteResult {
  ok: true;
  summary: string;
  affected: Record<string, unknown>;
}

async function call(action: "parse" | "execute", body: unknown) {
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
  if (!resp.ok) {
    throw new Error(data?.error || `Error ${resp.status}`);
  }
  return data;
}

export const parseCommand = (text: string) => call("parse", { text }) as Promise<ParsedIntent>;
export const executeCommand = (intent: {
  intent: string;
  confidence: number;
  payload: Record<string, unknown>;
}) => call("execute", intent) as Promise<ExecuteResult>;

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
};

export const DESTRUCTIVE_INTENTS = new Set([
  "registrar_mortalidad",
  "dividir_lote",
  "editar_lote",
  "trasladar_animales",
]);
