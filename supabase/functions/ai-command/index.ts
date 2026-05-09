// AI Operational Copilot — multi-operation parser with parse | execute | execute_batch.
// LLM never accesses the DB. Output is strict JSON validated by zod;
// typed handlers perform every mutation through the user's Supabase client (RLS intact).

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.23.5";
import { ZodError } from "npm:zod@3.23.8";
import {
  INTENT_NAMES,
  PAYLOAD_SCHEMAS,
  validateIntent,
  validateOperation,
  type IntentName,
  type InvalidOperation,
  type ValidatedIntent,
  type ValidOperation,
} from "./schemas.ts";
import { buildSystemPrompt, type OrgContext } from "./prompt.ts";
import { normalizeOperations } from "./normalize.ts";
import { ResolveError } from "./resolve.ts";
import { handleCrearLinea, handleEditarLinea } from "./handlers/lineas.ts";
import { handleCrearCaja, handleEditarCaja } from "./handlers/cajas.ts";
import { handleCrearLote, handleEditarLote } from "./handlers/lotes.ts";
import { handleMortalidad } from "./handlers/mortalidad.ts";
import { handleTraslado } from "./handlers/traslados.ts";
import { handleDividirLote } from "./handlers/division.ts";
import { handleCrearCliente, handleEditarCliente } from "./handlers/clientes.ts";
import { handleCrearPedido, handleEditarPedido } from "./handlers/pedidos.ts";

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
  const [lotes, cajas, lineas, clientes, aliases, journals] = await Promise.all([
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
    sb.from("clientes")
      .select("nombre")
      .eq("organization_id", orgId)
      .eq("estado_cliente", "activo")
      .limit(40),
    sb.from("ai_aliases")
      .select("alias, entity_type, entity_ref")
      .eq("organization_id", orgId)
      .limit(50),
    sb.from("ai_journal_runs")
      .select("note")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  return {
    lotes: (lotes.data ?? []).map((l: any) => ({ codigo: l.codigo ?? "", especie: l.especie, cantidad: l.cantidad_actual ?? 0 })),
    cajas: (cajas.data ?? []).map((c: any) => ({ codigo: c.codigo, uso: c.uso })),
    lineas: (lineas.data ?? []).map((l: any) => ({ nombre: l.nombre, especie: l.especie })),
    clientes: (clientes.data ?? []).map((c: any) => ({ nombre: c.nombre })),
    aliases: (aliases.data ?? []).map((a: any) => ({ alias: a.alias, type: a.entity_type, ref: a.entity_ref })),
    recent_history: (journals.data ?? []).map((j: any) => j.note),
  };
}

function buildBatchTool() {
  // One operation = id + (intent + confidence + payload union).
  const operationOneOf = INTENT_NAMES.map((name) => ({
    type: "object",
    properties: {
      id: { type: "string", description: "tmp-1, tmp-2, …" },
      intent: { type: "string", enum: [name] },
      confidence: { type: "number" },
      payload: zodToJsonSchema(PAYLOAD_SCHEMAS[name as IntentName] as any, { target: "openApi3" }),
      source_text: { type: "string", description: "Fragmento literal de la nota" },
      explanation: {
        type: "object",
        properties: {
          understood: { type: "string", description: "Breve explicación de la operación detectada" },
          entities_resolved: { type: "array", items: { type: "string" }, description: "Entidades clave que se emparejaron del contexto" },
          assumptions_made: { type: "array", items: { type: "string" }, description: "Asunciones hechas al resolver la operación" },
        },
        required: ["understood"],
      },
    },
    required: ["id", "intent", "confidence", "payload", "explanation"],
    additionalProperties: false,
  }));

  return {
    type: "function" as const,
    function: {
      name: "registrar_operaciones",
      description: "Extrae TODAS las operaciones de la nota como elementos independientes.",
      parameters: {
        type: "object",
        properties: {
          operations: {
            type: "array",
            minItems: 1,
            maxItems: 20,
            items: { oneOf: operationOneOf },
          },
        },
        required: ["operations"],
        additionalProperties: false,
      },
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
      tools: [buildBatchTool()],
      tool_choice: { type: "function", function: { name: "registrar_operaciones" } },
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
  if (!call) throw new ResolveError("La IA no produjo operaciones válidas.", 422);
  let args: any;
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
  if (text.length > 4000) return json({ error: "Nota demasiado larga (máx 4000 caracteres)" }, 400);

  const ctx = await loadOrgContext(sb, orgId);
  const prompt = buildSystemPrompt(ctx);
  const raw = await callLLM(prompt, text);
  const rawOps: unknown[] = Array.isArray(raw?.operations) ? raw.operations : [];
  if (rawOps.length === 0) {
    return json({ ok: true, operations: [], invalid: [], note: text });
  }

  const { normalized, rejected, logs } = normalizeOperations(rawOps);

  const valid: ValidOperation[] = [];
  const invalid: InvalidOperation[] = [];

  // Rejected (non-object / unparsable) entries → invalid bucket
  rejected.forEach((r) => {
    invalid.push({
      id: `tmp-${r.index + 1}`,
      error: r.reason,
      raw: r.raw,
    });
  });

  normalized.forEach((op) => {
    const res = validateOperation(op);
    if (res.ok) valid.push(res.op);
    else invalid.push(res.bad);
  });

  if (invalid.length > 0) {
    console.warn("[ai-command] parse produced", invalid.length, "invalid op(s)");
  }

  return json({ ok: true, operations: valid, invalid, note: text, normalization: logs });
}

// Legacy single-op execute (kept for backward compatibility).
async function actionExecute(req: Request) {
  const { sb, orgId, userId } = await authedClient(req);
  const body = await req.json().catch(() => ({}));
  const intent = validateIntent(body) as ValidatedIntent;
  const handler = HANDLERS[intent.intent] as (
    sb: SupabaseClient, orgId: string, userId: string, payload: any,
  ) => Promise<{ ok: true; summary: string; affected: Record<string, unknown> }>;
  if (!handler) throw new ResolveError(`Intención no soportada: ${intent.intent}`, 400);
  const result = await handler(sb, orgId, userId, intent.payload);
  return json(result);
}

async function actionExecuteBatch(req: Request) {
  const { sb, orgId, userId } = await authedClient(req);
  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note.slice(0, 4000) : "";
  const rawOps: unknown[] = Array.isArray(body?.operations) ? body.operations : [];
  if (rawOps.length === 0) return json({ error: "Sin operaciones" }, 400);
  if (rawOps.length > 20) return json({ error: "Demasiadas operaciones (máx 20)" }, 400);

  // Defensive normalization: tolerate stringified ops, data→payload, etc.
  const { normalized, rejected } = normalizeOperations(rawOps);
  const ops: unknown[] = normalized;

  const results: Array<
    | { id: string; intent: string; status: "ok"; summary: string; affected: Record<string, unknown> }
    | { id: string; intent?: string; status: "error"; error: string }
  > = [];

  rejected.forEach((r) => {
    results.push({ id: `tmp-${r.index + 1}`, status: "error", error: r.reason });
  });

  for (const raw of ops) {
    const validated = validateOperation(raw);
    if (!validated.ok) {
      results.push({ id: validated.bad.id, intent: validated.bad.intent, status: "error", error: validated.bad.error });
      continue;
    }
    const op = validated.op;
    const handler = HANDLERS[op.intent] as (
      sb: SupabaseClient, orgId: string, userId: string, payload: any,
    ) => Promise<{ ok: true; summary: string; affected: Record<string, unknown> }>;
    if (!handler) {
      results.push({ id: op.id, intent: op.intent, status: "error", error: `Intención no soportada: ${op.intent}` });
      continue;
    }
    try {
      const r = await handler(sb, orgId, userId, op.payload);
      results.push({ id: op.id, intent: op.intent, status: "ok", summary: r.summary, affected: r.affected });
    } catch (e) {
      const msg = e instanceof ResolveError ? e.message : (e instanceof Error ? e.message : "Error desconocido");
      console.error("execute_batch op failed", op.id, op.intent, msg);
      results.push({ id: op.id, intent: op.intent, status: "error", error: msg });
    }
  }

  // Audit (best-effort, never fails the batch)
  try {
    await sb.from("ai_journal_runs").insert({
      organization_id: orgId,
      user_id: userId,
      note,
      operations: ops,
      invalid: rejected,
      results,
    });
  } catch (e) {
    console.error("ai_journal_runs insert failed", e);
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  const errCount = results.length - okCount;
  return json({ ok: true, results, summary: `${okCount} ejecutada(s), ${errCount} con error.` });
}

// Lightweight telemetry: best-effort insert into ai_telemetry_events.
// Never affects user-facing flow; failures are swallowed and logged.
async function actionTelemetry(req: Request) {
  try {
    const { sb, orgId, userId } = await authedClient(req);
    const body = await req.json().catch(() => ({}));
    const event_type = String(body?.event_type ?? "").trim().slice(0, 80);
    if (!event_type) return json({ ok: true });
    const duration_ms =
      typeof body?.duration_ms === "number" && Number.isFinite(body.duration_ms)
        ? Math.max(0, Math.min(3_600_000, Math.round(body.duration_ms)))
        : null;
    const metadata =
      body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};
    await sb.from("ai_telemetry_events").insert({
      organization_id: orgId,
      user_id: userId,
      event_type,
      duration_ms,
      metadata,
    });
    return json({ ok: true });
  } catch (e) {
    console.warn("telemetry insert failed", e);
    return json({ ok: true }); // never fail the client
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "parse";
    if (action === "parse") return await actionParse(req);
    if (action === "execute") return await actionExecute(req);
    if (action === "execute_batch") return await actionExecuteBatch(req);
    if (action === "telemetry") return await actionTelemetry(req);
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
