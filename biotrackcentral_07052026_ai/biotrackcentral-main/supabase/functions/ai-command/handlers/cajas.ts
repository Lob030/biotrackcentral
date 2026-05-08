import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveCaja } from "../resolve.ts";
import type { crearCajaSchema, editarCajaSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

export async function handleCrearCaja(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof crearCajaSchema>,
) {
  // Reject duplicates within the batch + against existing
  const codigos = Array.from(new Set(p.codigos.map((c) => c.trim()).filter(Boolean)));
  const { data: existing } = await sb
    .from("cajas")
    .select("codigo")
    .eq("organization_id", orgId)
    .in("codigo", codigos);
  if (existing && existing.length > 0) {
    throw new ResolveError(`Ya existen cajas: ${existing.map((c) => c.codigo).join(", ")}`, 409);
  }
  const rows = codigos.map((codigo) => ({
    organization_id: orgId,
    codigo,
    uso: p.uso,
    ubicacion: p.ubicacion ?? null,
    capacidad: p.capacidad ?? null,
  }));
  const { data, error } = await sb.from("cajas").insert(rows).select("id, codigo");
  if (error) throw error;
  return {
    ok: true as const,
    summary: `${data.length} caja(s) creada(s): ${data.map((c) => c.codigo).join(", ")}.`,
    affected: { cajas: data.map((c) => c.id) },
  };
}

export async function handleEditarCaja(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof editarCajaSchema>,
) {
  const caja = await resolveCaja(sb, orgId, p.ref);
  const { error } = await sb
    .from("cajas")
    .update(p.cambios)
    .eq("id", caja.id)
    .eq("organization_id", orgId);
  if (error) throw error;
  return {
    ok: true as const,
    summary: `Caja ${caja.codigo} actualizada.`,
    affected: { cajas: [caja.id] },
  };
}
