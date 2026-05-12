// Shared resolution helpers for the AI agent (look up entities by name/code).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function resolveCajaByCodigo(
  supabase: SupabaseClient,
  ref: string,
): Promise<{ id: string; codigo: string; capacidad: number | null } | null> {
  const { data } = await supabase
    .from("cajas")
    .select("id, codigo, capacidad")
    .ilike("codigo", ref)
    .maybeSingle();
  return data ?? null;
}

export async function resolveLineaByNombre(
  supabase: SupabaseClient,
  ref: string,
): Promise<{ id: string; nombre: string } | null> {
  const { data } = await supabase
    .from("lineas_geneticas")
    .select("id, nombre")
    .ilike("nombre", ref)
    .maybeSingle();
  return data ?? null;
}

export async function resolveLote(
  supabase: SupabaseClient,
  ref: string,
): Promise<{ id: string; codigo: string | null; cantidad_actual: number | null } | null> {
  // Try by codigo first, then by id
  const byCodigo = await supabase
    .from("lotes")
    .select("id, codigo, cantidad_actual")
    .ilike("codigo", ref)
    .maybeSingle();
  if (byCodigo.data) return byCodigo.data;
  if (/^[0-9a-f-]{36}$/i.test(ref)) {
    const byId = await supabase
      .from("lotes")
      .select("id, codigo, cantidad_actual")
      .eq("id", ref)
      .maybeSingle();
    if (byId.data) return byId.data;
  }
  return null;
}

export async function resolveCliente(
  supabase: SupabaseClient,
  ref: string,
): Promise<{ id: string; nombre: string } | null> {
  const { data } = await supabase
    .from("clientes")
    .select("id, nombre")
    .ilike("nombre", ref)
    .maybeSingle();
  return data ?? null;
}
