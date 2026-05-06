/**
 * Lineas Geneticas data layer.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lineasKeys } from "@/lib/queryKeys";
import type { LineaGeneticaRow } from "@/lib/types";

type LineaInsertPayload = Omit<LineaGeneticaRow, "id" | "created_at" | "updated_at">;
type LineaUpdatePayload = Partial<LineaInsertPayload>;

export async function fetchLineas(): Promise<LineaGeneticaRow[]> {
  const { data, error } = await supabase
    .from("lineas_geneticas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LineaGeneticaRow[];
}

export async function fetchLineasIndividuosCount(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("lotes")
    .select("linea_genetica_id, cantidad_actual")
    .eq("estado", "activo");
  if (error) throw error;
  const map: Record<string, number> = {};
  (data ?? []).forEach((l: { linea_genetica_id: string | null; cantidad_actual: number | null }) => {
    if (l.linea_genetica_id) {
      map[l.linea_genetica_id] = (map[l.linea_genetica_id] || 0) + (l.cantidad_actual || 0);
    }
  });
  return map;
}

export async function createLinea(payload: LineaInsertPayload) {
  const { error } = await supabase.from("lineas_geneticas").insert(payload);
  if (error) throw error;
}

export async function updateLinea(id: string, payload: LineaUpdatePayload) {
  const { error } = await supabase.from("lineas_geneticas").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteLinea(id: string) {
  const { error } = await supabase.from("lineas_geneticas").delete().eq("id", id);
  if (error) throw error;
}

export function useLineasList() {
  return useQuery({ queryKey: lineasKeys.all, queryFn: fetchLineas });
}

export function useLineasIndividuosCount() {
  return useQuery({
    queryKey: [...lineasKeys.all, "individuos-count"] as const,
    queryFn: fetchLineasIndividuosCount,
  });
}

export function useUpsertLinea(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id?: string; payload: LineaInsertPayload }) => {
      if (args.id) await updateLinea(args.id, args.payload);
      else await createLinea(args.payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lineasKeys.all });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

export function useDeleteLinea(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLinea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lineasKeys.all });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}
