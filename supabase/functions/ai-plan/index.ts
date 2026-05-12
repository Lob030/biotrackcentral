import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { IntentSchemas, ALL_INTENTS, type IntentName } from "../_shared/ai-schemas.ts";
import { resolveCajaByCodigo, resolveLineaByNombre, resolveLote, resolveCliente } from "../_shared/ai-resolve.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const BodySchema = z.object({
  prompt: z.string().trim().min(2).max(4000),
  workspace_id: z.string().uuid(),
});

const SYSTEM_PROMPT = `Eres un asistente operativo para un bioterio. Convierte la nota del usuario en una lista de operaciones discretas usando la herramienta "emit_operations". Cada operación debe ser uno de: ${ALL_INTENTS.join(", ")}. Si una operación no encaja exactamente en un schema, omítela. Las fechas siempre en formato YYYY-MM-DD. Las especies válidas: ASF, Raton, Rata. No inventes datos. Si nada es claro, devuelve operations: [].`;

const tool = {
  type: "function",
  function: {
    name: "emit_operations",
    description: "Emit one or more discrete operations parsed from the user note.",
    parameters: {
      type: "object",
      properties: {
        operations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              intent: { type: "string", enum: ALL_INTENTS },
              payload: { type: "object" },
            },
            required: ["intent", "payload"],
          },
        },
      },
      required: ["operations"],
    },
  },
};

async function dryRun(
  supabase: SupabaseClient,
  intent: IntentName,
  payload: Record<string, unknown>,
): Promise<{ preview: string; warnings: string[] }> {
  const w: string[] = [];
  switch (intent) {
    case "crear_linea_genetica":
      return { preview: `Crear línea "${(payload as any).nombre}" (${(payload as any).especie})`, warnings: w };
    case "editar_linea_genetica": {
      const r = await resolveLineaByNombre(supabase, (payload as any).ref);
      if (!r) throw new Error(`Línea genética no encontrada: ${(payload as any).ref}`);
      return { preview: `Editar línea "${r.nombre}"`, warnings: w };
    }
    case "crear_caja":
      return { preview: `Crear ${(payload as any).codigos.length} caja(s): ${(payload as any).codigos.join(", ")} (uso ${(payload as any).uso})`, warnings: w };
    case "editar_caja": {
      const r = await resolveCajaByCodigo(supabase, (payload as any).ref);
      if (!r) throw new Error(`Caja no encontrada: ${(payload as any).ref}`);
      return { preview: `Editar caja "${r.codigo}"`, warnings: w };
    }
    case "crear_lote": {
      if ((payload as any).caja) {
        const c = await resolveCajaByCodigo(supabase, (payload as any).caja);
        if (!c) w.push(`Caja "${(payload as any).caja}" no existe; se creará el lote sin caja.`);
      }
      if ((payload as any).linea_genetica) {
        const l = await resolveLineaByNombre(supabase, (payload as any).linea_genetica);
        if (!l) w.push(`Línea "${(payload as any).linea_genetica}" no existe; se creará sin línea.`);
      }
      return { preview: `Crear lote "${(payload as any).codigo}" (${(payload as any).especie}, nacido ${(payload as any).fecha_nacimiento})`, warnings: w };
    }
    case "editar_lote": {
      const l = await resolveLote(supabase, (payload as any).ref);
      if (!l) throw new Error(`Lote no encontrado: ${(payload as any).ref}`);
      return { preview: `Editar lote "${l.codigo ?? l.id}"`, warnings: w };
    }
    case "registrar_mortalidad": {
      let lote = (payload as any).lote ? await resolveLote(supabase, (payload as any).lote) : null;
      if ((payload as any).lote && !lote) throw new Error(`Lote no encontrado: ${(payload as any).lote}`);
      if (lote && lote.cantidad_actual !== null && (payload as any).cantidad > lote.cantidad_actual) {
        w.push(`La cantidad (${(payload as any).cantidad}) excede el stock actual (${lote.cantidad_actual}).`);
      }
      return { preview: `Registrar ${(payload as any).cantidad} mortalidad${lote ? ` en lote "${lote.codigo ?? lote.id}"` : ` por caja "${(payload as any).caja}"`}`, warnings: w };
    }
    case "trasladar_animales": {
      const l = await resolveLote(supabase, (payload as any).lote_origen);
      if (!l) throw new Error(`Lote origen no encontrado: ${(payload as any).lote_origen}`);
      const c = await resolveCajaByCodigo(supabase, (payload as any).caja_destino);
      if (!c) throw new Error(`Caja destino no encontrada: ${(payload as any).caja_destino}`);
      return { preview: `Trasladar lote "${l.codigo ?? l.id}" a caja "${c.codigo}"`, warnings: w };
    }
    case "dividir_lote": {
      const l = await resolveLote(supabase, (payload as any).lote_origen);
      if (!l) throw new Error(`Lote origen no encontrado: ${(payload as any).lote_origen}`);
      const total = ((payload as any).movimientos as Array<{ cantidad: number }>).reduce((s, m) => s + m.cantidad, 0);
      if (l.cantidad_actual !== null && total > l.cantidad_actual) {
        w.push(`Total a mover (${total}) excede stock actual (${l.cantidad_actual}).`);
      }
      return { preview: `Dividir lote "${l.codigo ?? l.id}" en ${(payload as any).movimientos.length} movimiento(s)`, warnings: w };
    }
    case "crear_cliente":
      return { preview: `Crear cliente "${(payload as any).nombre}"`, warnings: w };
    case "crear_pedido": {
      const c = await resolveCliente(supabase, (payload as any).cliente);
      if (!c) throw new Error(`Cliente no encontrado: ${(payload as any).cliente}`);
      return { preview: `Crear pedido para "${c.nombre}" con ${(payload as any).items.length} línea(s)`, warnings: w };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = BodySchema.safeParse(await req.json());
    if (!body.success) {
      return new Response(JSON.stringify({ error: body.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { prompt, workspace_id } = body.data;

    // Validate workspace ownership via RLS
    const { data: ws } = await supabase.from("workspaces").select("id").eq("id", workspace_id).maybeSingle();
    if (!ws) {
      return new Response(JSON.stringify({ error: "Workspace inválido o sin acceso" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call Lovable AI Gateway
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Fecha de hoy: ${new Date().toISOString().slice(0, 10)}\n\nNota: ${prompt}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_operations" } },
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Límite de uso de IA alcanzado, intenta más tarde." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Sin créditos de IA. Agrega fondos en Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: `IA gateway error: ${t.slice(0, 200)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    let parsedOps: Array<{ intent: string; payload: Record<string, unknown> }> = [];
    try {
      const args = JSON.parse(toolCall?.function?.arguments ?? "{}");
      parsedOps = Array.isArray(args.operations) ? args.operations : [];
    } catch (_) { /* ignore */ }

    const operations: Array<{ id: string; intent: string; payload: Record<string, unknown>; preview: string; warnings: string[] }> = [];
    const invalid: Array<{ id: string; intent?: string; error: string }> = [];

    for (const op of parsedOps) {
      const id = crypto.randomUUID();
      const intent = op.intent as IntentName;
      const schema = IntentSchemas[intent];
      if (!schema) { invalid.push({ id, intent: op.intent, error: "Intent no soportado" }); continue; }
      const parsed = schema.safeParse(op.payload);
      if (!parsed.success) { invalid.push({ id, intent, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }); continue; }
      try {
        const { preview, warnings } = await dryRun(supabase, intent, parsed.data as Record<string, unknown>);
        operations.push({ id, intent, payload: parsed.data as Record<string, unknown>, preview, warnings });
      } catch (e) {
        invalid.push({ id, intent, error: e instanceof Error ? e.message : "Error de validación" });
      }
    }

    const planId = crypto.randomUUID();
    await supabase.from("ai_action_logs").insert({
      id: planId,
      user_id: userId,
      workspace_id,
      prompt,
      plan: { operations, invalid },
      status: "planned",
    });

    return new Response(JSON.stringify({ plan_id: planId, operations, invalid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
