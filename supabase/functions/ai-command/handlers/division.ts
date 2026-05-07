import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveCaja, resolveLote } from "../resolve.ts";
import type { dividirLoteSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

export async function handleDividirLote(
  sb: SupabaseClient,
  orgId: string,
  userId: string,
  p: z.infer<typeof dividirLoteSchema>,
) {
  const lote = await resolveLote(sb, orgId, p.lote_origen);
  const total = p.movimientos.reduce((s, m) => s + m.cantidad, 0);
  if (total > (lote.cantidad_actual ?? 0)) {
    throw new ResolveError(
      `La división suma ${total} ind., pero el lote sólo tiene ${lote.cantidad_actual ?? 0}.`,
      400,
    );
  }
  const fecha = p.fecha ?? new Date().toISOString().slice(0, 10);

  const cajas = await Promise.all(p.movimientos.map((m) => resolveCaja(sb, orgId, m.caja)));

  const childIds: string[] = [];
  const summaries: string[] = [];

  for (let i = 0; i < p.movimientos.length; i++) {
    const m = p.movimientos[i];
    const caja = cajas[i];
    const codigo = m.codigo_nuevo
      ?? `${lote.codigo ?? lote.id.slice(0, 6)}-${caja.codigo}`;
    const { data: child, error: cErr } = await sb
      .from("lotes")
      .insert({
        organization_id: orgId,
        codigo,
        especie: lote.especie,
        tipo: lote.tipo,
        fecha_nacimiento: lote.fecha_nacimiento,
        fecha_nacimiento_original: lote.fecha_nacimiento_original ?? lote.fecha_nacimiento,
        fecha_introduccion_caja: fecha,
        cantidad_inicial: m.cantidad,
        cantidad_actual: m.cantidad,
        machos: m.sexo === "macho" ? m.cantidad : 0,
        hembras: m.sexo === "hembra" ? m.cantidad : 0,
        linea_genetica_id: lote.linea_genetica_id,
        lote_padre_id: lote.id,
        caja_id: caja.id,
        sexo: m.sexo === "mixto" ? null : (m.sexo ?? null),
      })
      .select("id, codigo")
      .single();
    if (cErr) throw cErr;
    childIds.push(child.id);
    summaries.push(`${m.cantidad}${m.sexo ? ` ${m.sexo}` : ""} → ${caja.codigo} (${child.codigo})`);
  }

  // Subtract total from origin
  const { error: ajErr } = await sb.from("lote_eventos").insert({
    organization_id: orgId,
    lote_id: lote.id,
    tipo: "ajuste",
    fecha,
    cantidad: -total,
    notas: `División en ${p.movimientos.length} lote(s): ${summaries.join("; ")}`,
    created_by: userId,
  });
  if (ajErr) throw ajErr;

  // If origin emptied, mark as dividido
  if (total === (lote.cantidad_actual ?? 0)) {
    await sb.from("lotes").update({ estado: "dividido" }).eq("id", lote.id).eq("organization_id", orgId);
  }

  return {
    ok: true as const,
    summary: `Lote ${lote.codigo ?? lote.id.slice(0, 6)} dividido: ${summaries.join("; ")}.`,
    affected: { lotes: [lote.id, ...childIds] },
  };
}
