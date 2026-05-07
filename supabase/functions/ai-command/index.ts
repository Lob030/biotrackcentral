// AI Operational Copilot — single edge function with two actions: parse | execute.
// The LLM never accesses the DB. It produces strict JSON validated by zod;
// typed handlers perform every mutation through the Supabase client (RLS intact).

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.23.5";
import { ZodError } from "npm:zod@3.23.8";
import {
  INTENT_NAMES,
  PAYLOAD_SCHEMAS,
  validateIntent,
  type IntentName,
  type ValidatedIntent,
} from "./schemas.ts";
import { buildSystemPrompt, type OrgContext } from "./prompt.ts";
import { ResolveError } from "./resolve.ts";
import { handleCrearLinea, handleEditarLinea } from "./handlers/lineas.ts";
import { handleCrearCaja, handleEditarCaja } from "./handlers/cajas.ts";
import { handleCrearLote, handleEditarLote } from "./handlers/lotes.ts";
import { handleMortalidad } from "./handlers/mortalidad.ts";
import { handleTraslado } from "./handlers/traslados.ts";
import { handleDividirLote } from "./handlers/division.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const HANDLERS = {
  crear_linea_genetica: handleCrearLinea,
  editar_linea_genetica: handleEditarLinea,
  crear_caja: handleCrearCaja,
  editar_caja: handleEditarCaja,
  crear_lote: handleCrearLote,
  editar_lote: handleEditarLote,
  registrar_mortalidad: handleMortalidad,
  trasladar_animales: handleTraslado,
  dividir_lote: handleDividirLote,
} as const;

async function authedClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ResolveError("No autorizado", 401);
  }
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.slice(7);
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) throw new ResolveError("No autorizado", 401);
  const userId = data.claims.sub as string;
  const { data: prof } = await sb.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  if (!prof?.organization_id) throw new ResolveError("Perfil sin organización", 403);
  return { sb, userId, orgId: prof.organization_id as string };
}

async function loadOrgContext(sb: SupabaseClient, orgId: string): Promise<OrgContext> {
  const [lotes, cajas, lineas] = await Promise.all([
    sb.from("lotes")
      .select("codigo, especie, cantidad_actual")
      .eq("organization_id", orgId)
      .eq("estado", "activo")
      .order("created_at", { ascending: false })
      .limit(60),
    sb.from("cajas")
      .select("codigo, uso")
      .eq("organization_id", orgId)
      .order("codigo", { ascending: true })
      .limit(80),
    sb.from("lineas_geneticas")
      .select("nombre, especie")
      .eq("organization_id", orgId)
      .order("nombre", { ascending: true })
      .limit(40),
  ]);
  return {
    lotes: (lotes.data ?? []).map((l: any) => ({ codigo: l.codigo ?? "", especie: l.especie, cantidad: l.cantidad_actual ?? 0 })),
    cajas: (cajas.data ?? []).map((c: any) => ({ codigo: c.codigo, uso: c.uso })),
    lineas: (lineas.data ?? []).map((l: any) => ({ nombre: l.nombre, especie: l.especie })),
  };
}

function buildTool() {
  // Build a JSON schema union for the LLM tool. Each intent has its own variant.
  const oneOf = INTENT_NAMES.map((name) => ({
    type: "object",
    properties: {
      intent: { type: "string", enum: [name] },
      confidence: { type: "number" },
      payload: zodToJsonSchema(PAYLOAD_SCHEMAS[name as IntentName] as any, { target: "openApi3" }),
    },
    required: ["intent", "confidence", "payload"],
    additionalProperties: false,
  }));

  return {
    type: "function" as const,
    function: {
      name: "registrar_intencion",
      description: "Registra UNA intención operativa estructurada para BioTrack.",
      parameters: { oneOf },
    },
  };
}

async function callLLM(systemPrompt: string, userText: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new ResolveError("LOVABLE_API_KEY no configurado", 500);

  const today = new Date().toISOString().slice(0, 10);
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt + `\nFecha de hoy: ${today}.` },
        { role: "user", content: userText },
      ],
      tools: [buildTool()],
      tool_choice: { type: "function", function: { name: "registrar_intencion" } },
    }),
  });
  if (resp.status === 429) throw new ResolveError("Demasiadas solicitudes. Intenta de nuevo en un momento.", 429);
  if (resp.status === 402) throw new ResolveError("Sin créditos de IA. Añade fondos en Lovable AI.", 402);
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error", resp.status, t);
    throw new ResolveError("Error en el servicio de IA", 500);
  }
  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new ResolveError("La IA no produjo una intención válida.", 422);
  let args: unknown;
  try {
    args = typeof call.function.arguments === "string" ? JSON.parse(call.function.arguments) : call.function.arguments;
  } catch {
    throw new ResolveError("Respuesta de IA no parseable.", 422);
  }
  return args;
}

async function actionParse(req: Request) {
  const { sb, orgId } = await authedClient(req);
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim();
  if (!text) return json({ error: "Texto vacío" }, 400);
  if (text.length > 1000) return json({ error: "Comando demasiado largo" }, 400);

  const ctx = await loadOrgContext(sb, orgId);
  const prompt = buildSystemPrompt(ctx);
  const raw = await callLLM(prompt, text);
  const intent = validateIntent(raw);
  return json({
    ok: true,
    intent: intent.intent,
    confidence: intent.confidence,
    payload: intent.payload,
    requires_confirmation: true,
  });
}

async function actionExecute(req: Request) {
  const { sb, orgId, userId } = await authedClient(req);
  const body = await req.json().catch(() => ({}));
  const intent = validateIntent(body) as ValidatedIntent;
  const handler = HANDLERS[intent.intent] as (
    sb: SupabaseClient,
    orgId: string,
    userId: string,
    payload: any,
  ) => Promise<{ ok: true; summary: string; affected: Record<string, unknown> }>;
  if (!handler) throw new ResolveError(`Intención no soportada: ${intent.intent}`, 400);
  const result = await handler(sb, orgId, userId, intent.payload);
  return json(result);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "parse";
    if (action === "parse") return await actionParse(req);
    if (action === "execute") return await actionExecute(req);
    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    if (e instanceof ZodError) {
      return json({ error: "Intención inválida", details: e.flatten() }, 422);
    }
    if (e instanceof ResolveError) {
      return json({ error: e.message }, e.status);
    }
    console.error("ai-command error", e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
