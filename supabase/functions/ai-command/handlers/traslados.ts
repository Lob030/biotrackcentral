import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveCaja, resolveLote } from "../resolve.ts";
import type { trasladoSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

export async function handleTraslado(
  sb: SupabaseClient,
  orgId: string,
  userId: string,
  p: z.infer<typeof trasladoSchema>,
) {
  const lote = await resolveLote(sb, orgId, p.lote_origen);
  const caja = await resolveCaja(sb, orgId, p.caja_destino);
  if (lote.caja_id === caja.id) {
    throw new ResolveError(`El lote ya está en la caja ${caja.codigo}.`, 400);
  }

  // If a partial quantity is given, this is a split-style move; we model it as
  // a lote split with a single movement so cantidades stay consistent.
  if (p.cantidad && p.cantidad < (lote.cantidad_actual ?? 0)) {
    if (p.cantidad > (lote.cantidad_actual ?? 0)) {
      throw new ResolveError("Cantidad mayor al stock del lote.", 400);
    }
    return await splitMove(sb, orgId, userId, lote, caja, p.cantidad, p.fecha, p.notas, p.sexo);
  }

  // Full traslado of the lote (entire stock or no cantidad given)
  const { error } = await sb.from("lote_eventos").insert({
    organization_id: orgId,
    lote_id: lote.id,
    tipo: "traslado_caja",
    fecha: p.fecha ?? new Date().toISOString().slice(0, 10),
    cantidad: 0,
    caja_destino_id: caja.id,
    notas: p.notas ?? null,
    created_by: userId,
  });
  if (error) throw error;
  return {
    ok: true as const,
    summary: `Lote ${lote.codigo ?? lote.id.slice(0, 6)} trasladado a caja ${caja.codigo}.`,
    affected: { lotes: [lote.id], cajas: [caja.id] },
  };
}

async function splitMove(
  sb: SupabaseClient,
  orgId: string,
  userId: string,
  lote: any,
  cajaDestino: any,
  cantidad: number,
  fecha: string | undefined,
  notas: string | undefined,
  sexo: string | undefined,
) {
  const fechaFinal = fecha ?? new Date().toISOString().slice(0, 10);
  // Create child lote in destination caja
  const childCodigo = `${lote.codigo ?? lote.id.slice(0, 6)}-S${Date.now().toString(36).slice(-4)}`;
  const { data: child, error: childErr } = await sb
    .from("lotes")
    .insert({
      organization_id: orgId,
      codigo: childCodigo,
      especie: lote.especie,
      tipo: lote.tipo,
      fecha_nacimiento: lote.fecha_nacimiento,
      fecha_nacimiento_original: lote.fecha_nacimiento_original ?? lote.fecha_nacimiento,
      fecha_introduccion_caja: fechaFinal,
      cantidad_inicial: cantidad,
      cantidad_actual: cantidad,
      linea_genetica_id: lote.linea_genetica_id,
      lote_padre_id: lote.id,
      caja_id: cajaDestino.id,
      notas: notas ?? null,
    })
    .select("id, codigo")
    .single();
  if (childErr) throw childErr;

  // Subtract from origin via ajuste event (negative)
  const sexoNote = sexo ? ` [${sexo}]` : "";
  const { error: ajusteErr } = await sb.from("lote_eventos").insert({
    organization_id: orgId,
    lote_id: lote.id,
    tipo: "ajuste",
    fecha: fechaFinal,
    cantidad: -cantidad,
    notas: `Traslado parcial → ${child.codigo}${sexoNote}`,
    created_by: userId,
  });
  if (ajusteErr) throw ajusteErr;

  return {
    ok: true as const,
    summary: `${cantidad} ind. de ${lote.codigo ?? lote.id.slice(0, 6)} trasladados a caja ${cajaDestino.codigo} (nuevo lote ${child.codigo}).`,
    affected: { lotes: [lote.id, child.id], cajas: [cajaDestino.id] },
  };
}
