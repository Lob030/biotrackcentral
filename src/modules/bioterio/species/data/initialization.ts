/**
 * Workspace Initialization Data Layer
 * 
 * Handles seeding workspaces with initial species profiles and settings.
 */

import { supabase } from "@/integrations/supabase/client";
import { createSpeciesProfile, addSizeClass } from "./index";
import { 
  TENEBRIO_STARTER_BLUEPRINT, 
  TENEBRIO_DEFAULT_SIZE_CLASSES,
  TENEBRIO_DEFAULT_OPERATIONAL_SETTINGS,
  ASF_STARTER_BLUEPRINT,
  ASF_DEFAULT_SIZE_CLASSES,
  ASF_DEFAULT_OPERATIONAL_SETTINGS
} from "../runtime/types";

export async function seedWorkspaceSpecies(workspaceId: string, speciesId: string) {
  let blueprint: any;
  let sizeClasses: any[];
  let settings: any;

  const id = speciesId.toLowerCase();

  if (id === 'tenebrios') {
    blueprint = TENEBRIO_STARTER_BLUEPRINT;
    sizeClasses = TENEBRIO_DEFAULT_SIZE_CLASSES;
    settings = TENEBRIO_DEFAULT_OPERATIONAL_SETTINGS;
  } else if (id === 'asf') {
    blueprint = ASF_STARTER_BLUEPRINT;
    sizeClasses = ASF_DEFAULT_SIZE_CLASSES;
    settings = ASF_DEFAULT_OPERATIONAL_SETTINGS;
  } else {
    // Default to ASF if unknown for now, or skip
    console.warn(`Unknown species ID: ${speciesId}. Skipping seeding.`);
    return;
  }

  // 1. Create Species Profile
  const profile = await createSpeciesProfile({
    workspaceId,
    speciesId: blueprint.speciesId,
    speciesName: blueprint.speciesName,
    operationalName: blueprint.operationalName,
    scientificName: blueprint.scientificName,
    description: blueprint.description,
    isStarterBlueprint: true,
  });

  // 2. Add Size Classes
  for (const sc of sizeClasses) {
    await addSizeClass({
      workspaceId,
      speciesProfileId: profile.id,
      name: sc.name,
      code: sc.code,
      minWeightGrams: sc.minWeightGrams,
      maxWeightGrams: sc.maxWeightGrams,
      minAgeDays: sc.minAgeDays,
      maxAgeDays: sc.maxAgeDays,
      salePrice: sc.salePrice,
      costPrice: sc.costPrice,
      displayOrder: sc.displayOrder,
      isDefault: sc.isDefault,
    });
  }

  // 3. Add Operational Settings
  const { error: settingsError } = await supabase
    .from("species_operational_settings")
    .insert({
      workspace_id: workspaceId,
      species_profile_id: profile.id,
      breeding_cycle_days: settings.breedingCycleDays,
      expected_weaning_age_days: settings.expectedWeaningAgeDays,
      expected_gestation_days: settings.expectedGestationDays,
      maturity_age_days: settings.maturityAgeDays,
      expected_birth_weight_grams: settings.expectedBirthWeightGrams,
      expected_adult_weight_grams: settings.expectedAdultWeightGrams,
      expected_mortality_rate: settings.expectedMortalityRate,
      expected_growth_curve: settings.expectedGrowthCurve,
      default_sex_ratio: settings.defaultSexRatio,
      typical_litter_size: settings.typicalLitterSize,
    });

  if (settingsError) throw settingsError;

  return profile;
}
