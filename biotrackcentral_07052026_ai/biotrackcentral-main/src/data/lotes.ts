/**
 * Lotes data layer (list-level reads only — Phase 2 scope).
 *
 * Mutations remain inline in pages this round to avoid touching business logic.
 */
import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
    // Keep previous rows visible while a new filter loads -> no blank flash.
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// Stock view: active lotes restricted to nacimiento/engorda. Used by Stock page.
// Keeps the legacy ["lotes-stock"] key so external invalidations (EventoDialog)
// keep working without changes.
// ---------------------------------------------------------------------------
export type LoteStockRow = LoteRow;

export async function fetchLotesStock(): Promise<LoteStockRow[]> {
  const { data, error } = await supabase
    .from("lotes")
    .select("*")
    .eq("estado", "activo")
    .in("tipo", ["nacimiento", "engorda"]);
  if (error) throw error;
  return (data ?? []) as LoteStockRow[];
}

export const lotesStockKey = ["lotes-stock"] as const;

export function useLotesStock() {
  return useQuery({
    queryKey: lotesStockKey,
    queryFn: fetchLotesStock,
  });
}

// ---------------------------------------------------------------------------
// Proyección view: active lotes with fecha_nacimiento, ordered ascending.
// Keeps the legacy ["lotes-proyeccion"] key.
// ---------------------------------------------------------------------------
export type LoteProyeccionRow = {
  id: string;
  codigo: string | null;
  especie: LoteRow["especie"];
  fecha_nacimiento: string | null;
  cantidad_actual: number | null;
  estado: string;
};

export async function fetchLotesProyeccion(): Promise<LoteProyeccionRow[]> {
  const { data, error } = await supabase
    .from("lotes")
    .select("id,codigo,especie,fecha_nacimiento,cantidad_actual,estado")
    .eq("estado", "activo")
    .not("fecha_nacimiento", "is", null)
    .order("fecha_nacimiento", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LoteProyeccionRow[];
}

export const lotesProyeccionKey = ["lotes-proyeccion"] as const;

export function useLotesProyeccion(opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: lotesProyeccionKey,
    queryFn: fetchLotesProyeccion,
    refetchInterval: opts?.refetchInterval,
  });
}
