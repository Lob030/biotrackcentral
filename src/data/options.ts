/**
 * Shared "option/lookup" queries.
 *
 * Low-risk Phase 2 migration: pages that need lightweight selectable lists
 * (cajas, líneas genéticas, clientes activos) should use these helpers
 * instead of redefining inline `useQuery` blocks.
 *
 * - Returns the raw fetcher (`fetchXxxOptions`) so callers can compose with
 *   their own `useQuery` options if needed.
 * - Provides ready-made hooks (`useXxxOptions`) for the common case.
 *
 * Keys come from `@/lib/queryKeys` so invalidation stays consistent.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cajasKeys, lineasKeys, clientesKeys } from "@/lib/queryKeys";

// Options/lookup lists rarely change during a session — keep them fresh
// for 5 minutes so opening dialogs feels instant and doesn't refetch on
// every mount.
const OPTIONS_STALE_TIME = 5 * 60 * 1000;

export interface CajaOption {
  id: string;
  codigo: string;
  uso: string;
  estado?: string;
}

export interface LineaGeneticaOption {
  id: string;
  nombre: string;
  especie: string;
}

export interface ClienteOption {
  id: string;
  nombre: string;
}

export async function fetchCajaOptions(opts?: { includeEstado?: boolean }): Promise<CajaOption[]> {
  const cols = opts?.includeEstado ? "id, codigo, uso, estado" : "id, codigo, uso";
  const { data, error } = await supabase.from("cajas").select(cols);
  if (error) throw error;
  return (data ?? []) as unknown as CajaOption[];
}

export async function fetchLineaGeneticaOptions(): Promise<LineaGeneticaOption[]> {
  const { data, error } = await supabase
    .from("lineas_geneticas")
    .select("id, nombre, especie");
  if (error) throw error;
  return (data ?? []) as unknown as LineaGeneticaOption[];
}

export async function fetchClienteOptionsActivos(): Promise<ClienteOption[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre")
    .eq("estado_cliente", "activo");
  if (error) throw error;
  return (data ?? []) as ClienteOption[];
}

export function useCajaOptions(opts?: { includeEstado?: boolean; enabled?: boolean }) {
  return useQuery({
    queryKey: [...cajasKeys.options(), { includeEstado: !!opts?.includeEstado }],
    queryFn: () => fetchCajaOptions({ includeEstado: opts?.includeEstado }),
    enabled: opts?.enabled,
  });
}

export function useLineaGeneticaOptions(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: lineasKeys.options(),
    queryFn: fetchLineaGeneticaOptions,
    enabled: opts?.enabled,
  });
}

export function useClienteOptionsActivos(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...clientesKeys.all, "options", "activos"] as const,
    queryFn: fetchClienteOptionsActivos,
    enabled: opts?.enabled,
  });
}
