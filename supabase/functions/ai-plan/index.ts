// Operational AI Assistant — single-op planner.
// Gemini 2.5 Flash, tool-calling, no execution.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { INTENT_NAMES, IntentSchemas, TOOL_PARAMS, type IntentName } from "../_shared/bioterio-ai-schemas.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are an Operational Copilot Parser for the BioTrack Central Bioterio system.
You are NOT a chatbot, assistant, or agent. Your ONLY responsibility:
1. detect ONE operational intent
2. resolve operational arguments
3. emit a SINGLE tool call

Allowed intents (closed set): ${INTENT_NAMES.join(", ")}.

NEVER:
- chain operations (1 command = 1 intent)
- guess ambiguous entities — emit needs_disambiguation
- assume missing required params — emit needs_disambiguation
- output prose, markdown, reasoning, or commentary
- invent intents outside the catalog — emit invalid_operation

Always set "confidence": high | medium | low. If low, prefer needs_disambiguation.
Tool calls ONLY.`;

const BodySchema = z.object({
  prompt: z.string().trim().min(2).max(2000),
  workspace_id: z.string().uuid(),
});

function buildTools() {
  const intentTools = INTENT_NAMES.map((name) => ({
    type: "function" as const,
    function: { name, description: `Operational intent: ${name}`, parameters: TOOL_PARAMS[name] },
  }));
  const meta = [
    {
      type: "function" as const,
      function: {
        name: "needs_disambiguation",
        description: "Emit when the command references entities ambiguously or omits required parameters.",
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string" },
            field: { type: "string", description: "Which field needs clarification (e.g. lotCode)." },
          },
          required: ["reason"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "invalid_operation",
        description: "Emit when the command does not map to any allowed intent.",
        parameters: {
          type: "object",
          properties: { reason: { type: "string" } },
          required: ["reason"],
        },
      },
    },
  ];
  return [...intentTools, ...meta];
}

async function resolveLote(sb: SupabaseClient, ref: string) {
  const { data } = await sb.from("lotes").select("id, codigo, cantidad_actual, caja_id, especie").ilike("codigo", ref);
  return data ?? [];
}
async function resolveCaja(sb: SupabaseClient, ref: string) {
  const { data } = await sb.from("cajas").select("id, codigo, capacidad").ilike("codigo", ref);
  return data ?? [];
}

interface ResolveContext {
  lotId?: string;
  fromCageId?: string;
  toCageId?: string;
  cageId?: string;
  maleLotId?: string;
  femaleLotId?: string;
  litterLotId?: string;
  breedingGroupId?: string;
}

interface ResolveResult {
  resolved: ResolveContext;
  candidates: Array<{ field: string; options: Array<{ id: string; label: string; hint?: string }> }>;
  warnings: string[];
  validationErrors: string[];
  preview: { lines: string[]; affectedLots: unknown[]; affectedCages: unknown[] };
}

async function buildPreview(
  sb: SupabaseClient,
  intent: IntentName,
  args: Record<string, unknown>,
): Promise<ResolveResult> {
  const result: ResolveResult = {
    resolved: {},
    candidates: [],
    warnings: [],
    validationErrors: [],
    preview: { lines: [], affectedLots: [], affectedCages: [] },
  };

  const resolveLotByCode = async (field: string, code: string): Promise<string | null> => {
    const matches = await resolveLote(sb, code);
    if (matches.length === 0) {
      result.validationErrors.push(`Lote no encontrado: ${code}`);
      return null;
    }
    if (matches.length > 1) {
      result.candidates.push({
        field,
        options: matches.map((m) => ({
          id: m.id,
          label: m.codigo ?? m.id,
          hint: `${m.especie} · ${m.cantidad_actual ?? 0} animales`,
        })),
      });
      return null;
    }
    return matches[0].id;
  };

  const resolveCageByCode = async (field: string, code: string): Promise<{ id: string; capacity: number | null; codigo: string } | null> => {
    const matches = await resolveCaja(sb, code);
    if (matches.length === 0) {
      result.validationErrors.push(`Caja no encontrada: ${code}`);
      return null;
    }
    if (matches.length > 1) {
      result.candidates.push({
        field,
        options: matches.map((m) => ({ id: m.id, label: m.codigo, hint: `cap ${m.capacidad ?? "?"}` })),
      });
      return null;
    }
    return { id: matches[0].id, capacity: matches[0].capacidad, codigo: matches[0].codigo };
  };

  switch (intent) {
    case "MOVE_LOT": {
      const a = args as { lotCode: string; targetCageCode: string; quantity?: number };
      const lotMatches = await resolveLote(sb, a.lotCode);
      if (lotMatches.length === 1) {
        result.resolved.lotId = lotMatches[0].id;
        result.resolved.fromCageId = lotMatches[0].caja_id ?? undefined;
        const cage = await resolveCageByCode("targetCageCode", a.targetCageCode);
        if (cage) {
          result.resolved.toCageId = cage.id;
          const moveQty = a.quantity ?? lotMatches[0].cantidad_actual ?? 0;
          result.preview.lines.push(`Lote ${lotMatches[0].codigo}: mover ${moveQty} animales → caja ${cage.codigo}`);
          if (cage.capacity != null) {
            result.preview.lines.push(`Caja ${cage.codigo}: capacidad ${cage.capacity} (verificar ocupación al ejecutar)`);
          }
        }
      } else if (lotMatches.length > 1) {
        result.candidates.push({
          field: "lotCode",
          options: lotMatches.map((m) => ({ id: m.id, label: m.codigo ?? m.id, hint: `${m.cantidad_actual ?? 0} animales` })),
        });
      } else {
        result.validationErrors.push(`Lote no encontrado: ${a.lotCode}`);
      }
      break;
    }
    case "ASSIGN_LOT_TO_CAGE": {
      const a = args as { lotCode: string; cageCode: string };
      const lotId = await resolveLotByCode("lotCode", a.lotCode);
      const cage = await resolveCageByCode("cageCode", a.cageCode);
      if (lotId) result.resolved.lotId = lotId;
      if (cage) result.resolved.cageId = cage.id;
      if (lotId && cage) result.preview.lines.push(`Asignar lote a caja ${cage.codigo}`);
      break;
    }
    case "REGISTER_MORTALITY": {
      const a = args as { lotCode: string; quantity: number };
      const matches = await resolveLote(sb, a.lotCode);
      if (matches.length === 1) {
        const lot = matches[0];
        result.resolved.lotId = lot.id;
        const current = lot.cantidad_actual ?? 0;
        const after = Math.max(0, current - a.quantity);
        result.preview.lines.push(`Lote ${lot.codigo}: cantidad ${current} → ${after}`);
        result.preview.lines.push(`Registrar ${a.quantity} mortalidad(es)`);
        if (a.quantity > current) {
          result.validationErrors.push(`La cantidad (${a.quantity}) excede el stock actual (${current}).`);
        }
      } else if (matches.length > 1) {
        result.candidates.push({
          field: "lotCode",
          options: matches.map((m) => ({ id: m.id, label: m.codigo ?? m.id, hint: `${m.cantidad_actual ?? 0} animales` })),
        });
      } else {
        result.validationErrors.push(`Lote no encontrado: ${a.lotCode}`);
      }
      break;
    }
    case "SUBDIVIDE_LOT": {
      const a = args as { lotCode: string; subdivisions: Array<{ sex: string; quantity: number; codeSuffix?: string }> };
      const matches = await resolveLote(sb, a.lotCode);
      if (matches.length === 1) {
        const lot = matches[0];
        result.resolved.lotId = lot.id;
        const total = a.subdivisions.reduce((s, x) => s + x.quantity, 0);
        const current = lot.cantidad_actual ?? 0;
        result.preview.lines.push(
          `Subdividir ${lot.codigo} (${current}) → ${a.subdivisions.map((s) => `${s.codeSuffix ?? s.sex}:${s.quantity}`).join(" + ")}`,
        );
        if (total > current) {
          result.validationErrors.push(`Total subdividido (${total}) excede stock (${current}).`);
        }
      } else if (matches.length > 1) {
        result.candidates.push({
          field: "lotCode",
          options: matches.map((m) => ({ id: m.id, label: m.codigo ?? m.id })),
        });
      } else {
        result.validationErrors.push(`Lote no encontrado: ${a.lotCode}`);
      }
      break;
    }
    case "CREATE_LOT": {
      const a = args as { speciesId: string; quantity: number; cageCode?: string };
      result.preview.lines.push(`Crear lote: ${a.speciesId}, ${a.quantity} animales`);
      if (a.cageCode) {
        const cage = await resolveCageByCode("cageCode", a.cageCode);
        if (cage) result.resolved.cageId = cage.id;
      }
      break;
    }
    case "CREATE_BREEDING_GROUP": {
      const a = args as { maleLotCode: string; femaleLotCode: string; cageCode: string };
      const m = await resolveLotByCode("maleLotCode", a.maleLotCode);
      const f = await resolveLotByCode("femaleLotCode", a.femaleLotCode);
      const cage = await resolveCageByCode("cageCode", a.cageCode);
      if (m) result.resolved.maleLotId = m;
      if (f) result.resolved.femaleLotId = f;
      if (cage) result.resolved.cageId = cage.id;
      if (m && f && cage) {
        result.preview.lines.push(`Crear grupo reproductor en caja ${cage.codigo} (♂ ${a.maleLotCode} × ♀ ${a.femaleLotCode})`);
      }
      break;
    }
    case "REGISTER_LITTER": {
      const a = args as { breedingGroupRef: string; litterSize: number; liveBirths: number };
      result.warnings.push(`Resolución de grupo reproductor "${a.breedingGroupRef}" se hará al ejecutar.`);
      result.preview.lines.push(`Registrar camada: ${a.litterSize} (${a.liveBirths} vivos)`);
      break;
    }
    case "REGISTER_WEANING": {
      const a = args as { litterLotCode: string; subdivisions: Array<{ sex: string; quantity: number }> };
      const lotId = await resolveLotByCode("litterLotCode", a.litterLotCode);
      if (lotId) result.resolved.litterLotId = lotId;
      result.preview.lines.push(`Destetar ${a.litterLotCode}: ${a.subdivisions.map((s) => `${s.sex}:${s.quantity}`).join(", ")}`);
      break;
    }
  }

  return result;
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

    const { data: ws } = await supabase.from("workspaces").select("id").eq("id", workspace_id).maybeSingle();
    if (!ws) {
      return new Response(JSON.stringify({ error: "Workspace inválido" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch workspace species context
    const { data: speciesProfiles } = await supabase
      .from("workspace_species_profiles")
      .select("id, species_name, operational_name")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    const { data: sizeClasses } = await supabase
      .from("species_size_classes")
      .select("id, species_profile_id, name, code, min_age_days, max_age_days, sale_price, display_order")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .order("display_order");

    // Fetch live availability per classification
    const { data: activeLots } = await supabase
      .from("lotes")
      .select("id, codigo, especie, size_class_id, cantidad_actual, fecha_nacimiento, estado, tipo")
      .eq("workspace_id", workspace_id)
      .eq("estado", "activo")
      .in("tipo", ["nacimiento", "engorda"]);

    const { data: activeReservations } = await supabase
      .from("inventory_reservations")
      .select("species_profile_id, size_class_id, remaining_quantity")
      .eq("workspace_id", workspace_id)
      .eq("status", "active");

    // Build availability context per classification
    const availabilityByClass: Record<string, number> = {};
    for (const lot of (activeLots ?? [])) {
      if (!lot.size_class_id) continue;
      availabilityByClass[lot.size_class_id] = (availabilityByClass[lot.size_class_id] ?? 0) + (lot.cantidad_actual ?? 0);
    }
    // Subtract reservations
    for (const res of (activeReservations ?? [])) {
      if (!res.size_class_id) continue;
      availabilityByClass[res.size_class_id] = Math.max(0, (availabilityByClass[res.size_class_id] ?? 0) - (res.remaining_quantity ?? 0));
    }

    const speciesContext = (speciesProfiles ?? []).map(p => {
      const pClasses = (sizeClasses ?? []).filter((sc: any) => sc.species_profile_id === p.id);
      const classLines = pClasses.map((sc: any) => {
        const available = availabilityByClass[sc.id] ?? 0;
        const price = sc.sale_price ? `$${sc.sale_price}` : "sin precio";
        return `  · ${sc.name}${sc.code ? ` [${sc.code}]` : ""}: ${available} disponibles (${price})`;
      }).join("\n");
      return `- ${p.operational_name} (${p.species_name}):\n${classLines || "  · Sin clasificaciones"}`;
    }).join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Operational Context for Workspace ${workspace_id}:

LIVE INVENTORY AVAILABILITY (derived, reservations already deducted):
${speciesContext || "No inventory data available."}

Today: ${new Date().toISOString().slice(0, 10)}
Command: ${prompt}` },
        ],
        tools: buildTools(),
        tool_choice: "required",
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Límite de uso de IA alcanzado." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Sin créditos de IA." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: `IA gateway: ${t.slice(0, 200)}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const planId = crypto.randomUUID();

    if (!toolCall) {
      await supabase.from("ai_action_logs").insert({
        id: planId, user_id: userId, workspace_id, prompt,
        plan: { status: "invalid", reason: "Sin tool call del modelo" },
        status: "invalid",
      });
      return new Response(JSON.stringify({ planId, status: "invalid", reason: "El modelo no produjo una operación." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolName = toolCall.function?.name as string;
    let toolArgs: Record<string, unknown> = {};
    try { toolArgs = JSON.parse(toolCall.function?.arguments ?? "{}"); } catch { /* ignore */ }

    if (toolName === "needs_disambiguation") {
      const payload = { planId, status: "needs_disambiguation" as const, reason: String(toolArgs.reason ?? "Aclaración requerida") };
      await supabase.from("ai_action_logs").insert({
        id: planId, user_id: userId, workspace_id, prompt,
        plan: { ...payload, raw: toolArgs }, status: "needs_disambiguation",
      });
      return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (toolName === "invalid_operation") {
      const payload = { planId, status: "invalid" as const, reason: String(toolArgs.reason ?? "Operación no permitida") };
      await supabase.from("ai_action_logs").insert({
        id: planId, user_id: userId, workspace_id, prompt,
        plan: { ...payload, raw: toolArgs }, status: "invalid",
      });
      return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!INTENT_NAMES.includes(toolName as IntentName)) {
      const payload = { planId, status: "invalid" as const, reason: `Intent no permitido: ${toolName}` };
      await supabase.from("ai_action_logs").insert({
        id: planId, user_id: userId, workspace_id, prompt,
        plan: payload, status: "invalid",
      });
      return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const intent = toolName as IntentName;
    const confidence = (toolArgs.confidence as string) ?? "medium";
    const schema = IntentSchemas[intent];
    const parsed = schema.safeParse(toolArgs);
    if (!parsed.success) {
      const payload = {
        planId, status: "invalid" as const,
        reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
      await supabase.from("ai_action_logs").insert({
        id: planId, user_id: userId, workspace_id, prompt,
        plan: { ...payload, raw: toolArgs }, status: "invalid",
      });
      return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const args = parsed.data as Record<string, unknown>;
    const ctx = await buildPreview(supabase, intent, args);

    if (ctx.candidates.length > 0) {
      const payload = {
        planId, status: "needs_disambiguation" as const,
        reason: "Se encontraron múltiples coincidencias.",
        candidates: ctx.candidates,
      };
      await supabase.from("ai_action_logs").insert({
        id: planId, user_id: userId, workspace_id, prompt,
        plan: { ...payload, intent, args, confidence }, status: "needs_disambiguation",
      });
      return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const operation = {
      id: crypto.randomUUID(),
      intent,
      args: { ...args, _resolved: ctx.resolved },
      confidence,
      preview: ctx.preview,
      warnings: ctx.warnings,
      validationErrors: ctx.validationErrors,
    };

    await supabase.from("ai_action_logs").insert({
      id: planId, user_id: userId, workspace_id, prompt,
      plan: {
        intent, args, confidence,
        warnings: ctx.warnings,
        validation_errors: ctx.validationErrors,
        preview_snapshot: ctx.preview,
        operational_context: { workspace_id },
      },
      status: "planned",
    });

    return new Response(JSON.stringify({ planId, status: "ok", operation }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
