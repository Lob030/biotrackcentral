/**
 * Species Profiles Data Layer
 * 
 * React Query hooks and Supabase integration for workspace species profiles.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  WorkspaceSpeciesProfile,
  SpeciesSizeClass,
  SpeciesOperationalSettings,
  SpeciesProfileFilters,
  SizeClassFilters,
} from "../runtime/types";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const speciesKeys = {
  all: ["species-profiles"] as const,
  workspace: (workspaceId: string) => [...speciesKeys.all, workspaceId] as const,
  profile: (profileId: string) => [...speciesKeys.all, "profile", profileId] as const,
  sizeClasses: (speciesProfileId: string) => [...speciesKeys.all, "size-classes", speciesProfileId] as const,
  settings: (speciesProfileId: string) => [...speciesKeys.all, "settings", speciesProfileId] as const,
};

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch all species profiles for a workspace
 */
export async function fetchSpeciesProfiles(workspaceId: string): Promise<WorkspaceSpeciesProfile[]> {
  const { data, error } = await supabase
    .from("workspace_species_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return (data ?? []).map(mapDbProfileToDomain);
}

/**
 * Fetch a single species profile
 */
export async function fetchSpeciesProfile(profileId: string): Promise<WorkspaceSpeciesProfile | null> {
  const { data, error } = await supabase
    .from("workspace_species_profiles")
    .select("*")
    .eq("id", profileId)
    .single();
  
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  if (!data) return null;
  return mapDbProfileToDomain(data);
}

/**
 * Fetch size classes for a species profile
 */
export async function fetchSizeClasses(speciesProfileId: string): Promise<SpeciesSizeClass[]> {
  const { data, error } = await supabase
    .from("species_size_classes")
    .select("*")
    .eq("species_profile_id", speciesProfileId)
    .order("display_order", { ascending: true });
  
  if (error) throw error;
  return (data ?? []).map(mapDbSizeClassToDomain);
}

/**
 * Fetch operational settings for a species profile
 */
export async function fetchOperationalSettings(speciesProfileId: string): Promise<SpeciesOperationalSettings | null> {
  const { data, error } = await supabase
    .from("species_operational_settings")
    .select("*")
    .eq("species_profile_id", speciesProfileId)
    .single();
  
  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;
  return mapDbSettingsToDomain(data);
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/**
 * Create a species profile
 */
export async function createSpeciesProfile(payload: {
  workspaceId: string;
  speciesId: string;
  speciesName: string;
  operationalName: string;
  scientificName?: string;
  description?: string;
  isStarterBlueprint?: boolean;
}): Promise<WorkspaceSpeciesProfile> {
  const { data, error } = await supabase
    .from("workspace_species_profiles")
    .insert({
      workspace_id: payload.workspaceId,
      species_id: payload.speciesId,
      species_name: payload.speciesName,
      operational_name: payload.operationalName,
      scientific_name: payload.scientificName,
      description: payload.description,
      is_starter_blueprint: payload.isStarterBlueprint ?? false,
      is_custom: !payload.isStarterBlueprint,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  return mapDbProfileToDomain(data);
}

/**
 * Update a species profile
 */
export async function updateSpeciesProfile(
  id: string,
  payload: Partial<{
    operationalName: string;
    description: string;
    isActive: boolean;
  }>
): Promise<WorkspaceSpeciesProfile> {
  const updatePayload: Record<string, unknown> = {};
  
  if (payload.operationalName !== undefined) {
    updatePayload.operational_name = payload.operationalName;
  }
  if (payload.description !== undefined) {
    updatePayload.description = payload.description;
  }
  if (payload.isActive !== undefined) {
    updatePayload.is_active = payload.isActive;
  }
  
  const { data, error } = await supabase
    .from("workspace_species_profiles")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return mapDbProfileToDomain(data);
}

/**
 * Delete a species profile
 */
export async function deleteSpeciesProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from("workspace_species_profiles")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

/**
 * Add a size class
 */
export async function addSizeClass(payload: {
  workspaceId: string;
  speciesProfileId: string;
  name: string;
  code?: string;
  minWeightGrams?: number;
  maxWeightGrams?: number;
  minAgeDays?: number;
  maxAgeDays?: number;
  salePrice?: number;
  costPrice?: number;
  displayOrder?: number;
  isDefault?: boolean;
  description?: string;
}): Promise<SpeciesSizeClass> {
  const { data, error } = await supabase
    .from("species_size_classes")
    .insert({
      workspace_id: payload.workspaceId,
      species_profile_id: payload.speciesProfileId,
      name: payload.name,
      code: payload.code,
      min_weight_grams: payload.minWeightGrams,
      max_weight_grams: payload.maxWeightGrams,
      min_age_days: payload.minAgeDays,
      max_age_days: payload.maxAgeDays,
      sale_price: payload.salePrice,
      cost_price: payload.costPrice,
      display_order: payload.displayOrder ?? 0,
      is_default: payload.isDefault ?? false,
      is_custom: true,
      is_active: true,
      description: payload.description,
    })
    .select()
    .single();
  
  if (error) throw error;
  return mapDbSizeClassToDomain(data);
}

/**
 * Update a size class
 */
export async function updateSizeClass(
  id: string,
  payload: Partial<{
    name: string;
    code: string;
    minWeightGrams: number;
    maxWeightGrams: number;
    minAgeDays: number;
    maxAgeDays: number;
    salePrice: number;
    costPrice: number;
    displayOrder: number;
    isDefault: boolean;
    isActive: boolean;
    description: string;
  }>
): Promise<SpeciesSizeClass> {
  const updatePayload: Record<string, unknown> = {};
  
  if (payload.name !== undefined) updatePayload.name = payload.name;
  if (payload.code !== undefined) updatePayload.code = payload.code;
  if (payload.minWeightGrams !== undefined) updatePayload.min_weight_grams = payload.minWeightGrams;
  if (payload.maxWeightGrams !== undefined) updatePayload.max_weight_grams = payload.maxWeightGrams;
  if (payload.minAgeDays !== undefined) updatePayload.min_age_days = payload.minAgeDays;
  if (payload.maxAgeDays !== undefined) updatePayload.max_age_days = payload.maxAgeDays;
  if (payload.salePrice !== undefined) updatePayload.sale_price = payload.salePrice;
  if (payload.costPrice !== undefined) updatePayload.cost_price = payload.costPrice;
  if (payload.displayOrder !== undefined) updatePayload.display_order = payload.displayOrder;
  if (payload.isDefault !== undefined) updatePayload.is_default = payload.isDefault;
  if (payload.isActive !== undefined) updatePayload.is_active = payload.isActive;
  if (payload.description !== undefined) updatePayload.description = payload.description;
  
  const { data, error } = await supabase
    .from("species_size_classes")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return mapDbSizeClassToDomain(data);
}

/**
 * Delete a size class
 */
export async function deleteSizeClass(id: string): Promise<void> {
  const { error } = await supabase
    .from("species_size_classes")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

/**
 * Reorder size classes
 */
export async function reorderSizeClasses(
  speciesProfileId: string,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    display_order: index + 1,
  }));
  
  const { error } = await supabase
    .from("species_size_classes")
    .upsert(updates);
  
  if (error) throw error;
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Get species profiles for a workspace
 */
export function useSpeciesProfiles(workspaceId: string) {
  return useQuery({
    queryKey: speciesKeys.workspace(workspaceId),
    queryFn: () => fetchSpeciesProfiles(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Get a single species profile
 */
export function useSpeciesProfile(profileId: string | null) {
  return useQuery({
    queryKey: speciesKeys.profile(profileId!),
    queryFn: () => fetchSpeciesProfile(profileId!),
    enabled: !!profileId,
  });
}

/**
 * Get size classes for a species profile
 */
export function useSizeClasses(speciesProfileId: string | null) {
  return useQuery({
    queryKey: speciesKeys.sizeClasses(speciesProfileId!),
    queryFn: () => fetchSizeClasses(speciesProfileId!),
    enabled: !!speciesProfileId,
  });
}

/**
 * Get operational settings for a species profile
 */
export function useOperationalSettings(speciesProfileId: string | null) {
  return useQuery({
    queryKey: speciesKeys.settings(speciesProfileId!),
    queryFn: () => fetchOperationalSettings(speciesProfileId!),
    enabled: !!speciesProfileId,
  });
}

/**
 * Upsert species profile (create or update)
 */
export function useUpsertSpeciesProfile(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (args: { id?: string; payload: Parameters<typeof createSpeciesProfile>[0] | Parameters<typeof updateSpeciesProfile>[1] }) => {
      if (args.id) {
        return await updateSpeciesProfile(args.id, args.payload as Parameters<typeof updateSpeciesProfile>[1]);
      } else {
        return await createSpeciesProfile(args.payload as Parameters<typeof createSpeciesProfile>[0]);
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: speciesKeys.workspace(data.workspaceId) });
      qc.invalidateQueries({ queryKey: speciesKeys.profile(data.id) });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

/**
 * Delete species profile
 */
export function useDeleteSpeciesProfile(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSpeciesProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: speciesKeys.all });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

/**
 * Add size class
 */
export function useAddSizeClass(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: addSizeClass,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: speciesKeys.sizeClasses(data.species_profile_id) });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

/**
 * Update size class
 */
export function useUpdateSizeClass(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (args: { id: string; payload: Parameters<typeof updateSizeClass>[1] }) => {
      return await updateSizeClass(args.id, args.payload);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: speciesKeys.sizeClasses(data.species_profile_id) });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

/**
 * Delete size class
 */
export function useDeleteSizeClass(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSizeClass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: speciesKeys.all });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

/**
 * Reorder size classes
 */
export function useReorderSizeClasses(opts?: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (args: { speciesProfileId: string; orderedIds: string[] }) => {
      await reorderSizeClasses(args.speciesProfileId, args.orderedIds);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: speciesKeys.sizeClasses(variables.speciesProfileId) });
      opts?.onSuccess?.();
    },
    onError: opts?.onError,
  });
}

// ============================================================================
// MAPPING FUNCTIONS (DB <-> Domain)
// ============================================================================

function mapDbProfileToDomain(row: Record<string, unknown>): WorkspaceSpeciesProfile {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    speciesId: row.species_id as string,
    speciesName: row.species_name as string,
    operationalName: row.operational_name as string,
    scientificName: row.scientific_name as string | undefined,
    description: row.description as string | undefined,
    isActive: row.is_active as boolean,
    isCustom: row.is_custom as boolean,
    isStarterBlueprint: row.is_starter_blueprint as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapDbSizeClassToDomain(row: Record<string, unknown>): SpeciesSizeClass {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    speciesProfileId: row.species_profile_id as string,
    name: row.name as string,
    code: row.code as string | undefined,
    minWeightGrams: row.min_weight_grams as number | undefined,
    maxWeightGrams: row.max_weight_grams as number | undefined,
    minAgeDays: row.min_age_days as number | undefined,
    maxAgeDays: row.max_age_days as number | undefined,
    salePrice: row.sale_price as number | undefined,
    costPrice: row.cost_price as number | undefined,
    displayOrder: row.display_order as number,
    isActive: row.is_active as boolean,
    isDefault: row.is_default as boolean,
    isCustom: row.is_custom as boolean,
    description: row.description as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapDbSettingsToDomain(row: Record<string, unknown>): SpeciesOperationalSettings {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    speciesProfileId: row.species_profile_id as string,
    breedingCycleDays: row.breeding_cycle_days as number,
    expectedWeaningAgeDays: row.expected_weaning_age_days as number,
    expectedGestationDays: row.expected_gestation_days as number,
    maturityAgeDays: row.maturity_age_days as number,
    expectedBirthWeightGrams: row.expected_birth_weight_grams as number,
    expectedAdultWeightGrams: row.expected_adult_weight_grams as number,
    expectedMortalityRate: row.expected_mortality_rate as number,
    expectedGrowthCurve: row.expected_growth_curve as string | undefined,
    defaultSexRatio: row.default_sex_ratio as number | undefined,
    typicalLitterSize: row.typical_litter_size as number | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
