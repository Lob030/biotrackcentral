import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveCliente, resolvePedido } from "../resolve.ts";
import type { crearPedidoSchema, editarPedidoSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

function nextOrderNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `P-${ymd}-${rand}`;
}

export async function handleCrearPedido(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof crearPedidoSchema>,
) {
  const cliente = await resolveCliente(sb, orgId, p.cliente);

  const lineas = p.lineas.map((l) => ({
    ...l,
    precio_unitario: l.precio_unitario ?? 0,
    subtotal: (l.precio_unitario ?? 0) * l.cantidad,
  }));
  const subtotal = lineas.reduce((acc, l) => acc + l.subtotal, 0);
  const porcentaje = p.porcentaje_descuento ?? 0;
  const monto_descuento = +(subtotal * (porcentaje / 100)).toFixed(2);
  const total = +(subtotal - monto_descuento).toFixed(2);

  const { data: pedido, error } = await sb
    .from("pedidos")
    .insert({
      organization_id: orgId,
      cliente_id: cliente.id,
      numero_pedido: nextOrderNumber(),
      fecha_pedido: p.fecha_pedido ?? new Date().toISOString().slice(0, 10),
      fecha_entrega_solicitada: p.fecha_entrega_solicitada ?? null,
      subtotal,
      porcentaje_descuento: porcentaje,
      monto_descuento,
      total,
      notas: p.notas ?? null,
    })
    .select("id, numero_pedido")
    .single();
  if (error) throw error;

  const detalleRows = lineas.map((l) => ({
    pedido_id: pedido.id,
    especie: l.especie,
    etapa: l.etapa,
    cantidad: l.cantidad,
    precio_unitario: l.precio_unitario,
    subtotal: l.subtotal,
  }));
  const { error: detErr } = await sb.from("pedidos_detalles").insert(detalleRows);
  if (detErr) {
    // rollback pedido (best-effort)
    await sb.from("pedidos").delete().eq("id", pedido.id);
    throw detErr;
  }

  return {
    ok: true as const,
    summary: `Pedido ${pedido.numero_pedido} creado para "${cliente.nombre}" (${lineas.length} línea(s), total ${total}).`,
    affected: { pedidos: [pedido.id] },
  };
}

export async function handleEditarPedido(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof editarPedidoSchema>,
) {
  const pedido = await resolvePedido(sb, orgId, p.ref);
  const { error } = await sb
    .from("pedidos")
    .update(p.cambios)
    .eq("id", pedido.id)
    .eq("organization_id", orgId);
  if (error) throw error;
  return {
    ok: true as const,
    summary: `Pedido ${pedido.numero_pedido} actualizado.`,
    affected: { pedidos: [pedido.id] },
  };
}
