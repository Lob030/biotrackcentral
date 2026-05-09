// Resolve textual references ("C57-22", "A1") to DB rows scoped to the user's org.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export class ResolveError extends Error {
  status: number;
  constructor(msg: string, status = 400) {
    super(msg);
    this.status = status;
  }
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function resolveLote(sb: SupabaseClient, orgId: string, ref: string) {
  if (isUuid(ref)) {
    const { data } = await sb.from("lotes").select("*").eq("id", ref).eq("organization_id", orgId).maybeSingle();
    if (!data) throw new ResolveError(`Lote no encontrado: ${ref}`, 404);
    return data;
  }
  const { data, error } = await sb
    .from("lotes")
    .select("*")
    .eq("organization_id", orgId)
    .ilike("codigo", ref);
  if (error) throw error;
  if (!data || data.length === 0) throw new ResolveError(`Lote no encontrado: "${ref}"`, 404);
  if (data.length > 1) throw new ResolveError(`"${ref}" coincide con varios lotes; sé más específico.`, 409);
  return data[0];
}

export async function resolveCaja(sb: SupabaseClient, orgId: string, ref: string) {
  if (isUuid(ref)) {
    const { data } = await sb.from("cajas").select("*").eq("id", ref).eq("organization_id", orgId).maybeSingle();
    if (!data) throw new ResolveError(`Caja no encontrada: ${ref}`, 404);
    return data;
  }
  const { data, error } = await sb
    .from("cajas")
    .select("*")
    .eq("organization_id", orgId)
    .ilike("codigo", ref);
  if (error) throw error;
  if (!data || data.length === 0) throw new ResolveError(`Caja no encontrada: "${ref}"`, 404);
  if (data.length > 1) throw new ResolveError(`"${ref}" coincide con varias cajas; sé más específico.`, 409);
  return data[0];
}

export async function resolveLinea(sb: SupabaseClient, orgId: string, ref: string) {
  if (isUuid(ref)) {
    const { data } = await sb.from("lineas_geneticas").select("*").eq("id", ref).eq("organization_id", orgId).maybeSingle();
    if (!data) throw new ResolveError(`Línea genética no encontrada: ${ref}`, 404);
    return data;
  }
  const { data, error } = await sb
    .from("lineas_geneticas")
    .select("*")
    .eq("organization_id", orgId)
    .ilike("nombre", ref);
  if (error) throw error;
  if (!data || data.length === 0) throw new ResolveError(`Línea no encontrada: "${ref}"`, 404);
  if (data.length > 1) throw new ResolveError(`"${ref}" coincide con varias líneas; sé más específico.`, 409);
  return data[0];
}

export async function resolveCliente(sb: SupabaseClient, orgId: string, ref: string) {
  if (isUuid(ref)) {
    const { data } = await sb.from("clientes").select("*").eq("id", ref).eq("organization_id", orgId).maybeSingle();
    if (!data) throw new ResolveError(`Cliente no encontrado: ${ref}`, 404);
    return data;
  }
  const { data, error } = await sb
    .from("clientes")
    .select("*")
    .eq("organization_id", orgId)
    .ilike("nombre", ref);
  if (error) throw error;
  if (!data || data.length === 0) throw new ResolveError(`Cliente no encontrado: "${ref}"`, 404);
  if (data.length > 1) throw new ResolveError(`"${ref}" coincide con varios clientes; sé más específico.`, 409);
  return data[0];
}

export async function resolvePedido(sb: SupabaseClient, orgId: string, ref: string) {
  if (isUuid(ref)) {
    const { data } = await sb.from("pedidos").select("*").eq("id", ref).eq("organization_id", orgId).maybeSingle();
    if (!data) throw new ResolveError(`Pedido no encontrado: ${ref}`, 404);
    return data;
  }
  const { data, error } = await sb
    .from("pedidos")
    .select("*")
    .eq("organization_id", orgId)
    .ilike("numero_pedido", ref);
  if (error) throw error;
  if (!data || data.length === 0) throw new ResolveError(`Pedido no encontrado: "${ref}"`, 404);
  if (data.length > 1) throw new ResolveError(`"${ref}" coincide con varios pedidos; sé más específico.`, 409);
  return data[0];
}
