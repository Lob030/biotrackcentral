/**
 * Cajas data layer.
 *
 * Wraps Supabase reads/writes for the `cajas` table so pages don't sprinkle
 * `supabase.from("cajas")...` calls. Query keys come from `queryKeys.ts` so
 * invalidations from un-migrated callers (`["cajas"]`) keep working.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cajasKeys } from "@/lib/queryKeys";
import type { CajaRow } from "@/lib/types";

type CajaInsertPayload = Omit<CajaRow, "id" | "created_at" | "updated_at">;
type CajaUpdatePayload = Partial<CajaInsertPayload>;

export async function fetchCajas(): Promise<CajaRow[]> {
  const { data, error } = await supabase.from("cajas").select("*").order("codigo");
  if (error) throw error;
  return (data ?? []) as CajaRow[];
}

export async function createCaja(payload: CajaInsertPayload) {
  const { error } = await supabase.from("cajas").insert(payload);
  if (error) throw error;
}

export async function updateCaja(id: string, payload: CajaUpdatePayload) {
  const { error } = await supabase.from("cajas").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteCaja(id: string) {
  const { error } = await supabase.from("cajas").delete().eq("id", id);
  if (error) throw error;
}

export function useCajasList() {
  return useQuery({
    queryKey: cajasKeys.all,
    queryFn: fetchCajas,
  });
}

export function useUpsertCaja(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id?: string; payload: CajaInsertPayload }) => {
      if (args.id) await updateCaja(args.id, args.payload);
      else await createCaja(args.payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cajasKeys.all });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

export function useDeleteCaja(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCaja,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cajasKeys.all });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}
