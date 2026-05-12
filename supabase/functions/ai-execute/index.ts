import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { resolveCajaByCodigo, resolveLineaByNombre, resolveLote, resolveCliente } from "../_shared/ai-resolve.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const BodySchema = z.object({
  plan_id: z.string().uuid(),
  approved_operation_ids: z.array(z.string().uuid()).min(1).max(50),
});

type Op = { id: string; intent: string; payload: any; preview: string; warnings: string[] };

async function getOrgId(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  if (!data?.organization_id) throw new Error("Sin organización");
  return data.organization_id as string;
}

async function execOne(supabase: SupabaseClient, orgId: string, op: Op): Promise<string> {
  const p = op.payload;
  switch (op.intent) {
    case "crear_linea_genetica": {
      const { error } = await supabase.from("lineas_geneticas").insert({
        organization_id: orgId, nombre: p.nombre, especie: p.especie,
        origen: p.origen ?? null, color_etiqueta: p.color_etiqueta ?? "#06b6d4",
      });
      if (error) throw new Error(error.message);
      return `Línea "${p.nombre}" creada.`;
    }
    case "editar_linea_genetica": {
      const r = await resolveLineaByNombre(supabase, p.ref);
      if (!r) throw new Error(`Línea no encontrada: ${p.ref}`);
      const { error } = await supabase.from("lineas_geneticas").update(p.cambios).eq("id", r.id);
      if (error) throw new Error(error.message);
      return `Línea "${r.nombre}" actualizada.`;
    }
    case "crear_caja": {
      const rows = (p.codigos as string[]).map((codigo) => ({
        organization_id: orgId, codigo, uso: p.uso,
        ubicacion: p.ubicacion ?? null, capacidad: p.capacidad ?? null, estado: "libre",
      }));
      const { error } = await supabase.from("cajas").insert(rows);
      if (error) throw new Error(error.message);
      return `${rows.length} caja(s) creada(s).`;
    }
    case "editar_caja": {
      const r = await resolveCajaByCodigo(supabase, p.ref);
      if (!r) throw new Error(`Caja no encontrada: ${p.ref}`);
      const { error } = await supabase.from("cajas").update(p.cambios).eq("id", r.id);
      if (error) throw new Error(error.message);
      return `Caja "${r.codigo}" actualizada.`;
    }
    case "crear_lote": {
      let cajaId: string | null = null;
      if (p.caja) { const c = await resolveCajaByCodigo(supabase, p.caja); cajaId = c?.id ?? null; }
      let lineaId: string | null = null;
      if (p.linea_genetica) { const l = await resolveLineaByNombre(supabase, p.linea_genetica); lineaId = l?.id ?? null; }
      const cantidad = p.cantidad_inicial ?? ((p.machos ?? 0) + (p.hembras ?? 0));
      const { error } = await supabase.from("lotes").insert({
        organization_id: orgId, codigo: p.codigo, especie: p.especie,
        fecha_nacimiento: p.fecha_nacimiento, tipo: p.tipo ?? "nacimiento",
        cantidad_inicial: cantidad, cantidad_actual: cantidad,
        machos: p.machos ?? 0, hembras: p.hembras ?? 0,
        caja_id: cajaId, linea_genetica_id: lineaId,
        fecha_introduccion_caja: cajaId ? p.fecha_nacimiento : null,
        notas: p.notas ?? null,
      });
      if (error) throw new Error(error.message);
      return `Lote "${p.codigo}" creado.`;
    }
    case "editar_lote": {
      const l = await resolveLote(supabase, p.ref);
      if (!l) throw new Error(`Lote no encontrado: ${p.ref}`);
      const cambios: Record<string, unknown> = { ...p.cambios };
      if (cambios.caja) {
        const c = await resolveCajaByCodigo(supabase, cambios.caja as string);
        if (!c) throw new Error(`Caja no encontrada: ${cambios.caja}`);
        cambios.caja_id = c.id; delete cambios.caja;
      }
      const { error } = await supabase.from("lotes").update(cambios).eq("id", l.id);
      if (error) throw new Error(error.message);
      return `Lote "${l.codigo ?? l.id}" actualizado.`;
    }
    case "registrar_mortalidad": {
      let loteId: string | null = null;
      if (p.lote) { const l = await resolveLote(supabase, p.lote); if (!l) throw new Error(`Lote no encontrado: ${p.lote}`); loteId = l.id; }
      else if (p.caja) {
        const c = await resolveCajaByCodigo(supabase, p.caja);
        if (!c) throw new Error(`Caja no encontrada: ${p.caja}`);
        const { data } = await supabase.from("lotes").select("id").eq("caja_id", c.id).eq("estado", "activo").limit(1).maybeSingle();
        if (!data) throw new Error(`Sin lote activo en caja ${p.caja}`);
        loteId = data.id;
      }
      const { error } = await supabase.from("lote_eventos").insert({
        organization_id: orgId, lote_id: loteId, tipo: "mortalidad",
        cantidad: p.cantidad, fecha: p.fecha ?? new Date().toISOString().slice(0, 10),
        notas: p.notas ?? null,
      });
      if (error) throw new Error(error.message);
      return `${p.cantidad} mortalidad(es) registrada(s).`;
    }
    case "trasladar_animales": {
      const l = await resolveLote(supabase, p.lote_origen);
      if (!l) throw new Error(`Lote no encontrado: ${p.lote_origen}`);
      const c = await resolveCajaByCodigo(supabase, p.caja_destino);
      if (!c) throw new Error(`Caja no encontrada: ${p.caja_destino}`);
      const { error } = await supabase.from("lote_eventos").insert({
        organization_id: orgId, lote_id: l.id, tipo: "traslado_caja",
        cantidad: p.cantidad ?? 0, caja_destino_id: c.id,
        fecha: p.fecha ?? new Date().toISOString().slice(0, 10), notas: p.notas ?? null,
      });
      if (error) throw new Error(error.message);
      return `Lote trasladado a "${c.codigo}".`;
    }
    case "dividir_lote": {
      const l = await resolveLote(supabase, p.lote_origen);
      if (!l) throw new Error(`Lote no encontrado: ${p.lote_origen}`);
      const fecha = p.fecha ?? new Date().toISOString().slice(0, 10);
      let count = 0;
      for (const m of p.movimientos as Array<any>) {
        const c = await resolveCajaByCodigo(supabase, m.caja);
        if (!c) throw new Error(`Caja no encontrada: ${m.caja}`);
        const { error } = await supabase.from("lote_eventos").insert({
          organization_id: orgId, lote_id: l.id, tipo: "traslado_caja",
          cantidad: m.cantidad, caja_destino_id: c.id, fecha,
          notas: m.codigo_nuevo ? `Nuevo código: ${m.codigo_nuevo}` : null,
        });
        if (error) throw new Error(error.message);
        count++;
      }
      return `Lote dividido en ${count} movimiento(s).`;
    }
    case "crear_cliente": {
      const { error } = await supabase.from("clientes").insert({
        organization_id: orgId, nombre: p.nombre,
        tipo_cliente: p.tipo_cliente ?? "general",
        email: p.email ?? null, telefono: p.telefono ?? null,
        ciudad: p.ciudad ?? null, notas: p.notas ?? null,
      });
      if (error) throw new Error(error.message);
      return `Cliente "${p.nombre}" creado.`;
    }
    case "crear_pedido": {
      const c = await resolveCliente(supabase, p.cliente);
      if (!c) throw new Error(`Cliente no encontrado: ${p.cliente}`);
      const subtotal = (p.items as Array<any>).reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
      const numero = `P-${Date.now().toString().slice(-8)}`;
      const { data: pedido, error: e1 } = await supabase.from("pedidos").insert({
        organization_id: orgId, cliente_id: c.id, numero_pedido: numero,
        fecha_pedido: new Date().toISOString().slice(0, 10),
        fecha_entrega_solicitada: p.fecha_entrega_solicitada ?? null,
        subtotal, total: subtotal, notas: p.notas ?? null,
      }).select("id").single();
      if (e1 || !pedido) throw new Error(e1?.message ?? "Error creando pedido");
      const detalles = (p.items as Array<any>).map((it) => ({
        pedido_id: pedido.id, especie: it.especie, etapa: it.etapa,
        cantidad: it.cantidad, precio_unitario: it.precio_unitario,
        subtotal: it.cantidad * it.precio_unitario,
      }));
      const { error: e2 } = await supabase.from("pedidos_detalles").insert(detalles);
      if (e2) throw new Error(e2.message);
      return `Pedido ${numero} creado para "${c.nombre}".`;
    }
    default:
      throw new Error(`Intent desconocido: ${op.intent}`);
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

    const { data: log } = await supabase
      .from("ai_action_logs").select("id, plan, status")
      .eq("id", body.data.plan_id).maybeSingle();
    if (!log) return new Response(JSON.stringify({ error: "Plan no encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (log.status !== "planned") return new Response(JSON.stringify({ error: "Plan ya procesado" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const allOps: Op[] = (log.plan as any)?.operations ?? [];
    const approved = allOps.filter((o) => body.data.approved_operation_ids.includes(o.id));

    const orgId = await getOrgId(supabase, userId);
    const results: Array<{ id: string; intent: string; status: "ok" | "error"; summary?: string; error?: string }> = [];
    for (const op of approved) {
      try {
        const summary = await execOne(supabase, orgId, op);
        results.push({ id: op.id, intent: op.intent, status: "ok", summary });
      } catch (e) {
        results.push({ id: op.id, intent: op.intent, status: "error", error: e instanceof Error ? e.message : "Error" });
      }
    }
    const ok = results.filter((r) => r.status === "ok").length;
    const status = ok === 0 ? "failed" : ok === results.length ? "executed" : "partial";
    await supabase.from("ai_action_logs").update({ status, result: { results } }).eq("id", body.data.plan_id);

    return new Response(JSON.stringify({ results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-execute error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
