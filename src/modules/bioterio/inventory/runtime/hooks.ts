/**
 * Operational Availability Engine — Supabase Data Layer
 *
 * React Query hooks that fetch raw data and pipe it through the
 * availability engine operations. This is the bridge between
 * the database and the pure functional runtime.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildInventorySnapshot,
  getProjectedAvailability,
  validateAvailability,
  createReservation,
  releaseReservation,
  fulfillReservation,
  reconcileInventoryState,
} from './operations';
import type {
  InventorySnapshot,
  AvailabilityProjection,
  AvailabilityValidationResult,
  InventoryReservation,
  CreateReservationInput,
  LotForAvailability,
  SpeciesSettingsForProjection,
} from './types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const inventoryKeys = {
  all: ['inventory-availability'] as const,
  snapshot: (workspaceId: string) => [...inventoryKeys.all, 'snapshot', workspaceId] as const,
  projection: (workspaceId: string) => [...inventoryKeys.all, 'projection', workspaceId] as const,
  reservations: (workspaceId: string) => [...inventoryKeys.all, 'reservations', workspaceId] as const,
  movements: (workspaceId: string) => [...inventoryKeys.all, 'movements', workspaceId] as const,
  settings: (workspaceId: string) => [...inventoryKeys.all, 'settings', workspaceId] as const,
  sizeClasses: (workspaceId: string) => [...inventoryKeys.all, 'size-classes', workspaceId] as const,
};

// ============================================================================
// RAW DATA FETCHERS
// ============================================================================

async function fetchLotsForAvailability(workspaceId: string): Promise<LotForAvailability[]> {
  const { data, error } = await supabase
    .from('lotes')
    .select(`
      id,
      codigo,
      especie,
      size_class_id,
      cantidad_actual,
      fecha_nacimiento,
      estado,
      tipo,
      species_size_classes (
        id,
        name,
        code,
        species_profile_id,
        sale_price,
        min_age_days,
        max_age_days,
        display_order
      )
    `)
    .eq('workspace_id', workspaceId)
    .in('estado', ['activo'])
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Resolve species profiles for each lot via the size class
  const profileIds = [...new Set(
    (data ?? [])
      .map((l: any) => l.species_size_classes?.species_profile_id)
      .filter(Boolean)
  )];

  let profilesMap: Record<string, { id: string; species_name: string; operational_name: string }> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('workspace_species_profiles')
      .select('id, species_name, operational_name')
      .in('id', profileIds);

    profilesMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.id, p])
    );
  }

  return (data ?? []).map((l: any) => ({
    id: l.id,
    codigo: l.codigo,
    especie: l.especie,
    size_class_id: l.size_class_id,
    cantidad_actual: l.cantidad_actual,
    fecha_nacimiento: l.fecha_nacimiento,
    estado: l.estado,
    tipo: l.tipo,
    size_class: l.species_size_classes
      ? {
          id: l.species_size_classes.id,
          name: l.species_size_classes.name,
          code: l.species_size_classes.code,
          species_profile_id: l.species_size_classes.species_profile_id,
          sale_price: l.species_size_classes.sale_price,
          min_age_days: l.species_size_classes.min_age_days,
          max_age_days: l.species_size_classes.max_age_days,
          display_order: l.species_size_classes.display_order,
        }
      : null,
    species_profile: l.species_size_classes?.species_profile_id
      ? profilesMap[l.species_size_classes.species_profile_id] ?? null
      : null,
  })) as LotForAvailability[];
}

async function fetchReservations(workspaceId: string): Promise<InventoryReservation[]> {
  const { data, error } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['active'])
    .order('created_at', { ascending: false });

  if (error) {
    // Table may not exist yet — return empty gracefully
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    speciesProfileId: r.species_profile_id,
    sizeClassId: r.size_class_id,
    quantity: r.quantity,
    customerId: r.customer_id,
    customerName: r.customer_name,
    orderId: r.order_id,
    status: r.status,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    fulfilledAt: r.fulfilled_at,
    cancelledAt: r.cancelled_at,
    notes: r.notes,
    createdBy: r.created_by,
    fulfilledQuantity: r.fulfilled_quantity ?? 0,
    remainingQuantity: r.remaining_quantity ?? r.quantity,
  })) as InventoryReservation[];
}

async function fetchSizeClassesForEngine(workspaceId: string) {
  const { data, error } = await supabase
    .from('species_size_classes')
    .select('id, species_profile_id, name, code, min_age_days, max_age_days, display_order, sale_price')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data ?? [];
}

async function fetchSpeciesSettingsForEngine(workspaceId: string): Promise<SpeciesSettingsForProjection[]> {
  const { data, error } = await supabase
    .from('species_operational_settings')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) throw error;

  return (data ?? []).map((s: any) => ({
    speciesProfileId: s.species_profile_id,
    breedingCycleDays: s.breeding_cycle_days ?? 4,
    expectedWeaningAgeDays: s.expected_weaning_age_days ?? 21,
    expectedGestationDays: s.expected_gestation_days ?? 23,
    maturityAgeDays: s.maturity_age_days ?? 42,
    expectedMortalityRate: s.expected_mortality_rate ?? 0.05,
    typicalLitterSize: s.typical_litter_size,
  }));
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Core hook: returns the complete InventorySnapshot for the workspace.
 * This is the single source of operational availability truth.
 */
export function useInventorySnapshot(workspaceId: string | undefined) {
  const lotsQuery = useQuery({
    queryKey: [...inventoryKeys.snapshot(workspaceId ?? ''), 'lots'],
    queryFn: () => fetchLotsForAvailability(workspaceId!),
    enabled: !!workspaceId,
  });

  const reservationsQuery = useQuery({
    queryKey: inventoryKeys.reservations(workspaceId ?? ''),
    queryFn: () => fetchReservations(workspaceId!),
    enabled: !!workspaceId,
  });

  const snapshot = useMemo<InventorySnapshot | null>(() => {
    if (!workspaceId) return null;
    const lots = lotsQuery.data ?? [];
    const reservations = reservationsQuery.data ?? [];
    return buildInventorySnapshot(workspaceId, lots, reservations);
  }, [workspaceId, lotsQuery.data, reservationsQuery.data]);

  return {
    snapshot,
    lots: lotsQuery.data ?? [],
    reservations: reservationsQuery.data ?? [],
    isLoading: lotsQuery.isLoading || reservationsQuery.isLoading,
    isFetching: lotsQuery.isFetching || reservationsQuery.isFetching,
    error: lotsQuery.error || reservationsQuery.error,
    refetch: () => {
      lotsQuery.refetch();
      reservationsQuery.refetch();
    },
  };
}

/**
 * Availability Projection hook — computes future inventory timelines.
 */
export function useAvailabilityProjection(workspaceId: string | undefined) {
  const lotsQuery = useQuery({
    queryKey: [...inventoryKeys.projection(workspaceId ?? ''), 'lots'],
    queryFn: () => fetchLotsForAvailability(workspaceId!),
    enabled: !!workspaceId,
  });

  const sizeClassesQuery = useQuery({
    queryKey: inventoryKeys.sizeClasses(workspaceId ?? ''),
    queryFn: () => fetchSizeClassesForEngine(workspaceId!),
    enabled: !!workspaceId,
  });

  const settingsQuery = useQuery({
    queryKey: inventoryKeys.settings(workspaceId ?? ''),
    queryFn: () => fetchSpeciesSettingsForEngine(workspaceId!),
    enabled: !!workspaceId,
  });

  const projection = useMemo<AvailabilityProjection | null>(() => {
    if (!workspaceId) return null;
    const lots = lotsQuery.data ?? [];
    const sizeClasses = sizeClassesQuery.data ?? [];
    const settings = settingsQuery.data ?? [];

    if (lots.length === 0) return null;

    return getProjectedAvailability(lots, sizeClasses, settings);
  }, [workspaceId, lotsQuery.data, sizeClassesQuery.data, settingsQuery.data]);

  return {
    projection,
    isLoading: lotsQuery.isLoading || sizeClassesQuery.isLoading || settingsQuery.isLoading,
    error: lotsQuery.error || sizeClassesQuery.error || settingsQuery.error,
    refetch: () => {
      lotsQuery.refetch();
      sizeClassesQuery.refetch();
      settingsQuery.refetch();
    },
  };
}

/**
 * Combined hook: returns snapshot + projection + validation together.
 * Preferred hook for the main availability dashboard.
 */
export function useOperationalAvailability(workspaceId: string | undefined) {
  const {
    snapshot,
    lots,
    reservations,
    isLoading: snapshotLoading,
    error: snapshotError,
    refetch: refetchSnapshot,
  } = useInventorySnapshot(workspaceId);

  const {
    projection,
    isLoading: projectionLoading,
    error: projectionError,
    refetch: refetchProjection,
  } = useAvailabilityProjection(workspaceId);

  const validation = useMemo<AvailabilityValidationResult | null>(() => {
    if (!snapshot) return null;
    return validateAvailability(snapshot.classificationStates, reservations);
  }, [snapshot, reservations]);

  const refetch = () => {
    refetchSnapshot();
    refetchProjection();
  };

  return {
    snapshot,
    projection,
    validation,
    lots,
    reservations,
    isLoading: snapshotLoading || projectionLoading,
    error: snapshotError || projectionError,
    refetch,
  };
}

// ============================================================================
// RESERVATION MUTATIONS
// ============================================================================

/**
 * Create a reservation. Validates against current snapshot before persisting.
 */
export function useCreateReservation(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      input: CreateReservationInput;
      currentSnapshot: InventorySnapshot;
      existingReservations: InventoryReservation[];
    }) => {
      const { reservation, error } = createReservation(
        args.input,
        args.currentSnapshot.classificationStates,
        args.existingReservations
      );

      if (error || !reservation) throw new Error(error ?? 'No se pudo crear la reserva.');

      const { error: dbError } = await supabase.from('inventory_reservations').insert({
        id: reservation.id,
        workspace_id: reservation.workspaceId,
        species_profile_id: reservation.speciesProfileId,
        size_class_id: reservation.sizeClassId,
        quantity: reservation.quantity,
        customer_id: reservation.customerId,
        customer_name: reservation.customerName,
        order_id: reservation.orderId,
        status: reservation.status,
        expires_at: reservation.expiresAt,
        notes: reservation.notes,
        fulfilled_quantity: 0,
        remaining_quantity: reservation.quantity,
      });

      if (dbError) throw dbError;
      return reservation;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reservations(variables.input.workspaceId) });
      qc.invalidateQueries({ queryKey: inventoryKeys.snapshot(variables.input.workspaceId) });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

/**
 * Cancel (release) a reservation.
 */
export function useCancelReservation(workspaceId: string, opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { reservation: InventoryReservation; reason?: string }) => {
      const updated = releaseReservation(args.reservation, args.reason);

      const { error } = await supabase
        .from('inventory_reservations')
        .update({ status: 'cancelled', cancelled_at: updated.cancelledAt, notes: updated.notes })
        .eq('id', updated.id);

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reservations(workspaceId) });
      qc.invalidateQueries({ queryKey: inventoryKeys.snapshot(workspaceId) });
      opts?.onSuccess?.();
    },
  });
}

/**
 * Fulfill a reservation (fully or partially).
 */
export function useFulfillReservation(workspaceId: string, opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { reservation: InventoryReservation; quantity: number }) => {
      const updated = fulfillReservation(args.reservation, args.quantity);

      const { error } = await supabase
        .from('inventory_reservations')
        .update({
          status: updated.status,
          fulfilled_quantity: updated.fulfilledQuantity,
          remaining_quantity: updated.remainingQuantity,
          fulfilled_at: updated.fulfilledAt,
        })
        .eq('id', updated.id);

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.reservations(workspaceId) });
      qc.invalidateQueries({ queryKey: inventoryKeys.snapshot(workspaceId) });
      opts?.onSuccess?.();
    },
  });
}
