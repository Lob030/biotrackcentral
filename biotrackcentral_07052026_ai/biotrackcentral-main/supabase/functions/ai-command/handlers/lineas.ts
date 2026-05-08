import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveLinea } from "../resolve.ts";
import type { crearLineaSchema, editarLineaSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

export async function handleCrearLinea(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof crearLineaSchema>,
) {
  // Reject duplicates by name within the org
  const { data: dup } = await sb
    .from("lineas_geneticas")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("nombre", p.nombre)
    .maybeSingle();
  if (dup) throw new ResolveError(`Ya existe una línea llamada "${p.nombre}".`, 409);

  const { data, error } = await sb
    .from("lineas_geneticas")
    .insert({
      organization_id: orgId,
      nombre: p.nombre,
      especie: p.especie,
      origen: p.origen ?? null,
      color_etiqueta: p.color_etiqueta ?? "#06b6d4",
    })
    .select("id, nombre")
    .single();
  if (error) throw error;
  return { ok: true as const, summary: `Línea genética "${data.nombre}" creada.`, affected: { lineas: [data.id] } };
}

export async function handleEditarLinea(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof editarLineaSchema>,
) {
  const linea = await resolveLinea(sb, orgId, p.ref);
  const { error } = await sb
    .from("lineas_geneticas")
    .update(p.cambios)
    .eq("id", linea.id)
    .eq("organization_id", orgId);
  if (error) throw error;
  return {
    ok: true as const,
    summary: `Línea "${linea.nombre}" actualizada.`,
    affected: { lineas: [linea.id] },
  };
}
