import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ResolveError, resolveCliente } from "../resolve.ts";
import type { crearClienteSchema, editarClienteSchema } from "../schemas.ts";
import type { z } from "npm:zod@3.23.8";

export async function handleCrearCliente(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof crearClienteSchema>,
) {
  const { data: dup } = await sb
    .from("clientes")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("nombre", p.nombre)
    .maybeSingle();
  if (dup) throw new ResolveError(`Ya existe un cliente llamado "${p.nombre}".`, 409);

  const { data, error } = await sb
    .from("clientes")
    .insert({
      organization_id: orgId,
      nombre: p.nombre,
      contacto_principal: p.contacto_principal ?? null,
      email: p.email ?? null,
      telefono: p.telefono ?? null,
      tipo_cliente: p.tipo_cliente ?? "general",
      ciudad: p.ciudad ?? null,
      notas: p.notas ?? null,
    })
    .select("id, nombre")
    .single();
  if (error) throw error;
  return { ok: true as const, summary: `Cliente "${data.nombre}" creado.`, affected: { clientes: [data.id] } };
}

export async function handleEditarCliente(
  sb: SupabaseClient,
  orgId: string,
  _userId: string,
  p: z.infer<typeof editarClienteSchema>,
) {
  const cliente = await resolveCliente(sb, orgId, p.ref);
  const { error } = await sb
    .from("clientes")
    .update(p.cambios)
    .eq("id", cliente.id)
    .eq("organization_id", orgId);
  if (error) throw error;
  return {
    ok: true as const,
    summary: `Cliente "${cliente.nombre}" actualizado.`,
    affected: { clientes: [cliente.id] },
  };
}
