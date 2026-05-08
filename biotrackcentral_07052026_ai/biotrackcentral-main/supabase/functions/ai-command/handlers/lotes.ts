import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveCaja, resolveLinea, resolveLote } from "../resolve.ts";
import type { crearLoteSchema, editarLoteSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

export async function handleCrearLote(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof crearLoteSchema>,
) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.fecha_nacimiento > today) {
    throw new ResolveError("La fecha de nacimiento no puede ser futura.", 400);
  }
  const machos = p.machos ?? 0;
  const hembras = p.hembras ?? 0;
  let cantidad = p.cantidad_inicial ?? machos + hembras;
  if (machos + hembras > 0 && p.cantidad_inicial && p.cantidad_inicial !== machos + hembras) {
    throw new ResolveError("cantidad_inicial no coincide con machos + hembras.", 400);
  }

  // Duplicate codigo check
  const { data: dup } = await sb
    .from("lotes")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("codigo", p.codigo)
    .maybeSingle();
  if (dup) throw new ResolveError(`Ya existe un lote con código "${p.codigo}".`, 409);

  const linea = p.linea_genetica ? await resolveLinea(sb, orgId, p.linea_genetica) : null;
  const caja = p.caja ? await resolveCaja(sb, orgId, p.caja) : null;

  const { data, error } = await sb
    .from("lotes")
    .insert({
      organization_id: orgId,
      codigo: p.codigo,
      especie: p.especie,
      tipo: p.tipo ?? "nacimiento",
      fecha_nacimiento: p.fecha_nacimiento,
      fecha_introduccion_caja: caja ? p.fecha_nacimiento : null,
      cantidad_inicial: cantidad,
      cantidad_actual: cantidad,
      machos,
      hembras,
      linea_genetica_id: linea?.id ?? null,
      caja_id: caja?.id ?? null,
      notas: p.notas ?? null,
    })
    .select("id, codigo")
    .single();
  if (error) throw error;
  return {
    ok: true as const,
    summary: `Lote ${data.codigo} creado (${cantidad} ind.).`,
    affected: { lotes: [data.id] },
  };
}

export async function handleEditarLote(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof editarLoteSchema>,
) {
  const lote = await resolveLote(sb, orgId, p.ref);
  const update: Record<string, unknown> = {};
  if (p.cambios.codigo) update.codigo = p.cambios.codigo;
  if (p.cambios.estado) update.estado = p.cambios.estado;
  if (p.cambios.notas !== undefined) update.notas = p.cambios.notas;
  if (p.cambios.caja) {
    const caja = await resolveCaja(sb, orgId, p.cambios.caja);
    update.caja_id = caja.id;
  }
  const { error } = await sb.from("lotes").update(update).eq("id", lote.id).eq("organization_id", orgId);
  if (error) throw error;
  return {
    ok: true as const,
    summary: `Lote ${lote.codigo ?? lote.id.slice(0, 6)} actualizado.`,
    affected: { lotes: [lote.id] },
  };
}
