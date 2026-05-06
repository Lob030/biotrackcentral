/**
 * Lotes data layer (list-level reads only — Phase 2 scope).
 *
 * Mutations remain inline in pages this round to avoid touching business logic.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lotesKeys } from "@/lib/queryKeys";
import type { LoteRow } from "@/lib/types";

export type LoteListRow = LoteRow & {
  lineas_geneticas?: { nombre: string; color_etiqueta: string } | null;
  cajas?: { codigo: string } | null;
};

const LOTE_LIST_SELECT = "*, lineas_geneticas(nombre, color_etiqueta), cajas(codigo)";

export async function fetchLotesList(filters?: { estado?: string }): Promise<LoteListRow[]> {
  let q = supabase
    .from("lotes")
    .select(LOTE_LIST_SELECT)
    .order("created_at", { ascending: false });
  if (filters?.estado && filters.estado !== "all") {
    q = q.eq("estado", filters.estado as LoteRow["estado"]);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as LoteListRow[];
}

export function useLotesList(filters?: { estado?: string }) {
  return useQuery({
    queryKey: lotesKeys.list({ estado: filters?.estado ?? "all" }),
    queryFn: () => fetchLotesList(filters),
  });
}
