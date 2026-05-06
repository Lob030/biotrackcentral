/**
 * Clientes data layer.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clientesKeys } from "@/lib/queryKeys";
import { invalidateClientes } from "@/lib/invalidations";
import type { ClienteRow } from "@/lib/types";

type ClienteInsertPayload = Omit<ClienteRow, "id" | "created_at" | "updated_at">;
type ClienteUpdatePayload = Partial<ClienteInsertPayload>;

export async function fetchClientes(filters?: { estado?: string }): Promise<ClienteRow[]> {
  let q = supabase.from("clientes").select("*").order("created_at", { ascending: false });
  if (filters?.estado && filters.estado !== "all") {
    q = q.eq("estado_cliente", filters.estado as ClienteRow["estado_cliente"]);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ClienteRow[];
}

export async function createCliente(payload: ClienteInsertPayload) {
  const { error } = await supabase.from("clientes").insert(payload);
  if (error) throw error;
}

export async function updateCliente(id: string, payload: ClienteUpdatePayload) {
  const { error } = await supabase.from("clientes").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteCliente(id: string) {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
}

export function useClientesList(filters?: { estado?: string }) {
  return useQuery({
    queryKey: clientesKeys.list({ estado: filters?.estado ?? "all" }),
    queryFn: () => fetchClientes(filters),
  });
}

export function useUpsertCliente(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id?: string; payload: ClienteInsertPayload }) => {
      if (args.id) await updateCliente(args.id, args.payload);
      else await createCliente(args.payload);
    },
    onSuccess: () => {
      invalidateClientes(qc);
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

export function useDeleteCliente(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCliente,
    onSuccess: () => {
      invalidateClientes(qc);
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}
