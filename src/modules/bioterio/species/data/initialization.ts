/**
 * Workspace species initialization.
 *
 * Strict registry-based seeding. No fallback. No silent skip.
 * - `blueprint` seeds: create profile + size classes + operational settings
 *   from `findBlueprintByTaxonomyKey`.
 * - `custom` seeds: create a minimal profile only; operator configures size
 *   classes/settings later via the UI.
 *
 * If a blueprint is missing or the DB insert fails, this throws so the
 * workspace creation flow can roll back.
 */

import { supabase } from "@/integrations/supabase/client";
import type { SpeciesSeed } from "@/features/onboarding/lib/types";
import { findBlueprintByTaxonomyKey } from "./blueprintRegistry";

export async function seedWorkspaceSpecies(
  workspaceId: string,
  seed: SpeciesSeed,
): Promise<{ speciesProfileId: string }> {
  if (seed.kind === "custom") {
    return seedCustom(workspaceId, seed.displayName);
  }
  return seedBlueprint(workspaceId, seed.taxonomyKey);
}

async function seedCustom(
  workspaceId: string,
  displayName: string,
): Promise<{ speciesProfileId: string }> {
  const code = displayName.trim();
  if (!code) throw new Error("Custom species displayName is required");

  const { data, error } = await supabase
    .from("workspace_species_profiles")
    .insert({
      workspace_id: workspaceId,
      code,
      display_name: code,
      capability_profile: {},
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create custom species profile");
  }
  return { speciesProfileId: data.id };
}

async function seedBlueprint(
  workspaceId: string,
  taxonomyKey: string,
): Promise<{ speciesProfileId: string }> {
  const blueprint = findBlueprintByTaxonomyKey(taxonomyKey);
  if (!blueprint) {
    throw new Error(`Unknown species blueprint: ${taxonomyKey}`);
  }

  // 1. Profile
  const { data: profile, error: pErr } = await supabase
    .from("workspace_species_profiles")
    .insert({
      workspace_id: workspaceId,
      code: blueprint.code,
      display_name: blueprint.displayName,
      scientific_name: blueprint.scientificName ?? null,
      capability_profile: blueprint.profile.capabilities as unknown as Record<string, unknown>,
      is_active: true,
    })
    .select("id")
    .single();

  if (pErr || !profile) {
    throw new Error(pErr?.message ?? "Failed to insert species profile");
  }

  // 2. Size classes
  if (blueprint.sizeClasses.length > 0) {
    const rows = blueprint.sizeClasses.map((sc, idx) => ({
      species_profile_id: profile.id,
      code: sc.code ?? sc.name.slice(0, 6).toUpperCase(),
      display_name: sc.name,
      display_order: sc.displayOrder ?? idx + 1,
      min_age_days: sc.minAgeDays ?? null,
      max_age_days: sc.maxAgeDays ?? null,
      min_weight_g: sc.minWeightGrams ?? null,
      max_weight_g: sc.maxWeightGrams ?? null,
      is_default: sc.isDefault ?? false,
      is_sale_eligible: true,
      metadata: { description: sc.description ?? null, salePrice: sc.salePrice ?? null },
    }));
    const { error: scErr } = await supabase.from("species_size_classes").insert(rows);
    if (scErr) throw new Error(scErr.message);
  }

  // 3. Operational settings
  const { error: setErr } = await supabase.from("species_operational_settings").insert({
    species_profile_id: profile.id,
    quantity_unit: blueprint.profile.capabilities.operationalQuantityUnit ?? "individuals",
    lot_tracking_mode: "individual",
    track_breeding: true,
    track_mortality: true,
    default_breeding_cycle_days: blueprint.settings.breedingCycleDays ?? null,
    weaning_age_days: blueprint.settings.expectedWeaningAgeDays ?? null,
    settings: {
      expectedGestationDays: blueprint.settings.expectedGestationDays,
      maturityAgeDays: blueprint.settings.maturityAgeDays,
      expectedBirthWeightGrams: blueprint.settings.expectedBirthWeightGrams,
      expectedAdultWeightGrams: blueprint.settings.expectedAdultWeightGrams,
      expectedMortalityRate: blueprint.settings.expectedMortalityRate,
      expectedGrowthCurve: blueprint.settings.expectedGrowthCurve,
      defaultSexRatio: blueprint.settings.defaultSexRatio,
      typicalLitterSize: blueprint.settings.typicalLitterSize,
    },
  });
  if (setErr) throw new Error(setErr.message);

  return { speciesProfileId: profile.id };
}
