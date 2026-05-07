import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveCaja, resolveLote } from "../resolve.ts";
import type { mortalidadSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

export async function handleMortalidad(
  sb: SupabaseClient,
  orgId: string,
  userId: string,
  p: z.infer<typeof mortalidadSchema>,
) {
  let lote;
  if (p.lote) {
    lote = await resolveLote(sb, orgId, p.lote);
  } else if (p.caja) {
    const caja = await resolveCaja(sb, orgId, p.caja);
    const { data: lotesEnCaja, error } = await sb
      .from("lotes")
      .select("*")
      .eq("organization_id", orgId)
      .eq("caja_id", caja.id)
      .eq("estado", "activo");
    if (error) throw error;
    if (!lotesEnCaja || lotesEnCaja.length === 0) {
      throw new ResolveError(`No hay lotes activos en la caja ${caja.codigo}.`, 404);
    }
    if (lotesEnCaja.length > 1) {
      throw new ResolveError(
        `La caja ${caja.codigo} tiene ${lotesEnCaja.length} lotes; especifica el lote.`,
        409,
      );
    }
    lote = lotesEnCaja[0];
  } else {
    throw new ResolveError("Indica lote o caja.", 400);
  }

  if (p.cantidad > (lote.cantidad_actual ?? 0)) {
    throw new ResolveError(
      `El lote tiene ${lote.cantidad_actual ?? 0} ind., no se pueden registrar ${p.cantidad}.`,
      400,
    );
  }

  const sexoNote = p.sexo ? ` [${p.sexo}]` : "";
  const { error } = await sb.from("lote_eventos").insert({
    organization_id: orgId,
    lote_id: lote.id,
    tipo: "mortalidad",
    fecha: p.fecha ?? new Date().toISOString().slice(0, 10),
    cantidad: p.cantidad,
    notas: (p.notas ?? "") + sexoNote || null,
    created_by: userId,
  });
  if (error) throw error;

  return {
    ok: true as const,
    summary: `Mortalidad registrada en lote ${lote.codigo ?? lote.id.slice(0, 6)}: ${p.cantidad} ind.`,
    affected: { lotes: [lote.id], lote_eventos: 1 },
  };
}
