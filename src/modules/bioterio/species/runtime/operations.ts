/**
 * Workspace Species Profiles Runtime - Core Operations
 * 
 * Implements the fundamental operations for workspace-species configuration.
 * This is the operational foundation that allows each workspace to customize
 * how they manage species operationally.
 * 
 * CRITICAL PRINCIPLES:
 * - Species are NOT hardcoded operational behavior
 * - Each workspace can customize classifications, sizes, weights, ages, pricing
 * - Built-in species (ASF, Rat, Mouse) are starter blueprints, not immutable definitions
 * - Species Profiles are WORKSPACE-SCOPED
 * - Operational entities reference sizeClassId, NOT size names as strings
 */

import type {
  WorkspaceSpeciesProfile,
  SpeciesSizeClass,
  SpeciesOperationalSettings,
  GrowthClassification,
  SpeciesPricingProfile,
  SpeciesProfileFilters,
  SizeClassFilters,
  ClassificationResult,
  SpeciesConfigValidationResult,
  SpeciesConfigValidationError,
} from './types';

import {
  ASF_STARTER_BLUEPRINT,
  ASF_DEFAULT_SIZE_CLASSES,
  ASF_DEFAULT_OPERATIONAL_SETTINGS,
  TENEBRIO_STARTER_BLUEPRINT,
  TENEBRIO_DEFAULT_SIZE_CLASSES,
  TENEBRIO_DEFAULT_OPERATIONAL_SETTINGS,
} from './types';

// ============================================================================
// IN-MEMORY STORE (for demonstration/runtime purposes)
// In production, this would be backed by a database
// ============================================================================

class SpeciesProfileStore {
  private profiles: Map<string, WorkspaceSpeciesProfile> = new Map();
  private sizeClasses: Map<string, SpeciesSizeClass> = new Map();
  private operationalSettings: Map<string, SpeciesOperationalSettings> = new Map();
  private growthClassifications: Map<string, GrowthClassification> = new Map();
  private pricingProfiles: Map<string, SpeciesPricingProfile> = new Map();

  // Profile operations
  saveProfile(profile: WorkspaceSpeciesProfile): void {
    this.profiles.set(profile.id, profile);
  }

  getProfile(id: string): WorkspaceSpeciesProfile | undefined {
    return this.profiles.get(id);
  }

  getAllProfiles(): WorkspaceSpeciesProfile[] {
    return Array.from(this.profiles.values());
  }

  deleteProfile(id: string): boolean {
    return this.profiles.delete(id);
  }

  // Size class operations
  saveSizeClass(sizeClass: SpeciesSizeClass): void {
    this.sizeClasses.set(sizeClass.id, sizeClass);
  }

  getSizeClass(id: string): SpeciesSizeClass | undefined {
    return this.sizeClasses.get(id);
  }

  getAllSizeClasses(): SpeciesSizeClass[] {
    return Array.from(this.sizeClasses.values());
  }

  deleteSizeClass(id: string): boolean {
    return this.sizeClasses.delete(id);
  }

  // Operational settings operations
  saveOperationalSettings(settings: SpeciesOperationalSettings): void {
    this.operationalSettings.set(settings.id, settings);
  }

  getOperationalSettings(id: string): SpeciesOperationalSettings | undefined {
    return this.operationalSettings.get(id);
  }

  deleteOperationalSettings(id: string): boolean {
    return this.operationalSettings.delete(id);
  }

  // Growth classification operations
  saveGrowthClassification(classification: GrowthClassification): void {
    this.growthClassifications.set(classification.id, classification);
  }

  getGrowthClassification(id: string): GrowthClassification | undefined {
    return this.growthClassifications.get(id);
  }

  getAllGrowthClassifications(): GrowthClassification[] {
    return Array.from(this.growthClassifications.values());
  }

  deleteGrowthClassification(id: string): boolean {
    return this.growthClassifications.delete(id);
  }

  // Pricing profile operations
  savePricingProfile(profile: SpeciesPricingProfile): void {
    this.pricingProfiles.set(profile.id, profile);
  }

  getPricingProfile(id: string): SpeciesPricingProfile | undefined {
    return this.pricingProfiles.get(id);
  }

  deletePricingProfile(id: string): boolean {
    return this.pricingProfiles.delete(id);
  }
}

// Global store instance
const store = new SpeciesProfileStore();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp
 */
function now(): Date {
  return new Date();
}

// ============================================================================
// SPECIES PROFILE OPERATIONS
// ============================================================================

/**
 * Create a new workspace species profile from a starter blueprint
 * 
 * This instantiates an editable copy of a starter blueprint for a specific workspace.
 */
export function createSpeciesProfileFromBlueprint(args: {
  workspaceId: string;
  blueprintId: string;
  operationalName?: string;
}): WorkspaceSpeciesProfile {
  const { workspaceId, blueprintId, operationalName } = args;
  
  let blueprint: WorkspaceSpeciesProfile;
  let defaultSizeClasses: typeof ASF_DEFAULT_SIZE_CLASSES;
  let defaultSettings: typeof ASF_DEFAULT_OPERATIONAL_SETTINGS;
  
  // Select blueprint based on ID
  switch (blueprintId) {
    case 'starter_asf':
      blueprint = { ...ASF_STARTER_BLUEPRINT };
      defaultSizeClasses = ASF_DEFAULT_SIZE_CLASSES;
      defaultSettings = ASF_DEFAULT_OPERATIONAL_SETTINGS;
      break;
    case 'starter_tenebrio':
      blueprint = { ...TENEBRIO_STARTER_BLUEPRINT };
      defaultSizeClasses = TENEBRIO_DEFAULT_SIZE_CLASSES;
      defaultSettings = TENEBRIO_DEFAULT_OPERATIONAL_SETTINGS;
      break;
    // Additional blueprints can be added here
    default:
      throw new Error(`Unknown blueprint: ${blueprintId}`);
  }
  
  // Create workspace-specific profile
  const profile: WorkspaceSpeciesProfile = {
    ...blueprint,
    id: generateId(),
    workspaceId,
    operationalName: operationalName || blueprint.operationalName,
    isCustom: false,
    isStarterBlueprint: true,
    createdAt: now(),
    updatedAt: now(),
  };
  
  store.saveProfile(profile);
  
  // Create default size classes for this workspace
  defaultSizeClasses.forEach((sizeClassTemplate, index) => {
    const sizeClass: SpeciesSizeClass = {
      ...sizeClassTemplate,
      id: generateId(),
      workspaceId,
      speciesProfileId: profile.id,
      isCustom: false,
      displayOrder: index + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    store.saveSizeClass(sizeClass);
  });
  
  // Create default operational settings
  const settings: SpeciesOperationalSettings = {
    ...defaultSettings,
    id: generateId(),
    workspaceId,
    speciesProfileId: profile.id,
    createdAt: now(),
    updatedAt: now(),
  };
  store.saveOperationalSettings(settings);
  
  return profile;
}

/**
 * Create a custom species profile (not from blueprint)
 */
export function createCustomSpeciesProfile(args: {
  workspaceId: string;
  speciesId: string;
  speciesName: string;
  operationalName: string;
  scientificName?: string;
  description?: string;
}): WorkspaceSpeciesProfile {
  const { workspaceId, speciesId, speciesName, operationalName, scientificName, description } = args;
  
  const profile: WorkspaceSpeciesProfile = {
    id: generateId(),
    workspaceId,
    speciesId,
    speciesName,
    operationalName,
    scientificName,
    description,
    isActive: true,
    isCustom: true,
    isStarterBlueprint: false,
    createdAt: now(),
    updatedAt: now(),
  };
  
  store.saveProfile(profile);
  return profile;
}

/**
 * Update a species profile
 */
export function updateSpeciesProfile(
  profileId: string,
  updates: Partial<WorkspaceSpeciesProfile>
): WorkspaceSpeciesProfile | null {
  const profile = store.getProfile(profileId);
  if (!profile) return null;
  
  const updated: WorkspaceSpeciesProfile = {
    ...profile,
    ...updates,
    id: profileId, // Prevent ID change
    updatedAt: now(),
  };
  
  store.saveProfile(updated);
  return updated;
}

/**
 * Get species profiles for a workspace
 */
export function getSpeciesProfiles(filters: SpeciesProfileFilters): WorkspaceSpeciesProfile[] {
  const { workspaceId, speciesId, isActive, includeInactive, includeBlueprints } = filters;
  
  return store.getAllProfiles().filter((profile) => {
    // Workspace filter (required)
    if (profile.workspaceId !== workspaceId) return false;
    
    // Species ID filter
    if (speciesId) {
      const speciesIds = Array.isArray(speciesId) ? speciesId : [speciesId];
      if (!speciesIds.includes(profile.speciesId)) return false;
    }
    
    // Active status filter
    if (isActive !== undefined && profile.isActive !== isActive) return false;
    
    // Include inactive filter
    if (includeInactive === false && !profile.isActive) return false;
    
    // Include blueprints filter
    if (includeBlueprints === false && profile.isStarterBlueprint) return false;
    
    return true;
  });
}

/**
 * Get a single species profile
 */
export function getSpeciesProfile(profileId: string): WorkspaceSpeciesProfile | null {
  return store.getProfile(profileId) || null;
}

/**
 * Delete a species profile (and associated data)
 */
export function deleteSpeciesProfile(profileId: string): boolean {
  const profile = store.getProfile(profileId);
  if (!profile) return false;
  
  // Delete associated size classes
  const sizeClasses = getSizeClassesForSpecies({
    workspaceId: profile.workspaceId,
    speciesProfileId: profileId,
  });
  sizeClasses.forEach((sc) => store.deleteSizeClass(sc.id));
  
  // Delete associated operational settings
  const settingsArray = store.getAllGrowthClassifications();
  settingsArray.forEach((s) => {
    if (s.speciesProfileId === profileId) {
      store.deleteGrowthClassification(s.id);
    }
  });
  
  // Delete profile
  return store.deleteProfile(profileId);
}

// ============================================================================
// SIZE CLASS OPERATIONS
// ============================================================================

/**
 * Add a new size class to a species profile
 */
export function addSizeClass(args: {
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
}): SpeciesSizeClass {
  const {
    workspaceId,
    speciesProfileId,
    name,
    code,
    minWeightGrams,
    maxWeightGrams,
    minAgeDays,
    maxAgeDays,
    salePrice,
    costPrice,
    description,
  } = args;
  
  // Calculate display order
  const existingClasses = getSizeClassesForSpecies({ workspaceId, speciesProfileId });
  const displayOrder = args.displayOrder ?? Math.max(0, ...existingClasses.map((c) => c.displayOrder)) + 1;
  
  const sizeClass: SpeciesSizeClass = {
    id: generateId(),
    workspaceId,
    speciesProfileId,
    name,
    code,
    minWeightGrams,
    maxWeightGrams,
    minAgeDays,
    maxAgeDays,
    salePrice,
    costPrice,
    displayOrder,
    isActive: true,
    isDefault: args.isDefault ?? false,
    isCustom: true,
    description,
    createdAt: now(),
    updatedAt: now(),
  };
  
  store.saveSizeClass(sizeClass);
  return sizeClass;
}

/**
 * Update a size class
 */
export function updateSizeClass(
  sizeClassId: string,
  updates: Partial<SpeciesSizeClass>
): SpeciesSizeClass | null {
  const sizeClass = store.getSizeClass(sizeClassId);
  if (!sizeClass) return null;
  
  const updated: SpeciesSizeClass = {
    ...sizeClass,
    ...updates,
    id: sizeClassId, // Prevent ID change
    updatedAt: now(),
  };
  
  store.saveSizeClass(updated);
  return updated;
}

/**
 * Delete a size class
 */
export function deleteSizeClass(sizeClassId: string): boolean {
  return store.deleteSizeClass(sizeClassId);
}

/**
 * Get size classes for a species profile
 */
export function getSizeClassesForSpecies(filters: SizeClassFilters): SpeciesSizeClass[] {
  const { workspaceId, speciesProfileId, isActive, includeInactive } = filters;
  
  return store.getAllSizeClasses().filter((sc) => {
    if (sc.workspaceId !== workspaceId) return false;
    if (sc.speciesProfileId !== speciesProfileId) return false;
    if (isActive !== undefined && sc.isActive !== isActive) return false;
    if (includeInactive === false && !sc.isActive) return false;
    return true;
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Reorder size classes
 */
export function reorderSizeClasses(args: {
  workspaceId: string;
  speciesProfileId: string;
  orderedIds: string[];
}): SpeciesSizeClass[] {
  const { workspaceId, speciesProfileId, orderedIds } = args;
  
  const sizeClasses = getSizeClassesForSpecies({ workspaceId, speciesProfileId });
  const updatedClasses: SpeciesSizeClass[] = [];
  
  orderedIds.forEach((id, index) => {
    const sizeClass = sizeClasses.find((sc) => sc.id === id);
    if (sizeClass) {
      const updated = updateSizeClass(id, { displayOrder: index + 1 });
      if (updated) updatedClasses.push(updated);
    }
  });
  
  return updatedClasses;
}

// ============================================================================
// CLASSIFICATION OPERATIONS
// ============================================================================

/**
 * Classify a lot/animal by weight
 */
export function classifyLotByWeight(args: {
  workspaceId: string;
  speciesProfileId: string;
  weightGrams: number;
}): ClassificationResult | null {
  const { workspaceId, speciesProfileId, weightGrams } = args;
  
  const sizeClasses = getSizeClassesForSpecies({ workspaceId, speciesProfileId, isActive: true });
  
  // Find matching size class by weight
  for (const sc of sizeClasses) {
    if (
      sc.minWeightGrams !== undefined &&
      sc.maxWeightGrams !== undefined &&
      weightGrams >= sc.minWeightGrams &&
      weightGrams <= sc.maxWeightGrams
    ) {
      return {
        sizeClassId: sc.id,
        sizeClassName: sc.name,
        matchedBy: 'weight',
        confidence: 'exact',
      };
    }
  }
  
  // Fallback to default size class
  const defaultClass = sizeClasses.find((sc) => sc.isDefault);
  if (defaultClass) {
    return {
      sizeClassId: defaultClass.id,
      sizeClassName: defaultClass.name,
      matchedBy: 'weight',
      confidence: 'fallback',
    };
  }
  
  return null;
}

/**
 * Classify a lot/animal by age
 */
export function classifyLotByAge(args: {
  workspaceId: string;
  speciesProfileId: string;
  ageDays: number;
}): ClassificationResult | null {
  const { workspaceId, speciesProfileId, ageDays } = args;
  
  const sizeClasses = getSizeClassesForSpecies({ workspaceId, speciesProfileId, isActive: true });
  
  // Find matching size class by age
  for (const sc of sizeClasses) {
    if (
      sc.minAgeDays !== undefined &&
      (sc.maxAgeDays === undefined || ageDays <= sc.maxAgeDays) &&
      ageDays >= sc.minAgeDays
    ) {
      return {
        sizeClassId: sc.id,
        sizeClassName: sc.name,
        matchedBy: 'age',
        confidence: 'exact',
      };
    }
  }
  
  // Fallback to default size class
  const defaultClass = sizeClasses.find((sc) => sc.isDefault);
  if (defaultClass) {
    return {
      sizeClassId: defaultClass.id,
      sizeClassName: defaultClass.name,
      matchedBy: 'age',
      confidence: 'fallback',
    };
  }
  
  return null;
}

/**
 * Get operational size class by ID
 */
export function getOperationalSizeClass(sizeClassId: string): SpeciesSizeClass | null {
  return store.getSizeClass(sizeClassId) || null;
}

// ============================================================================
// VALIDATION OPERATIONS
// ============================================================================

/**
 * Validate species configuration
 * 
 * Detects:
 * - Overlapping weight ranges
 * - Overlapping age ranges
 * - Invalid ordering
 * - Negative values
 * - Impossible ranges
 */
export function validateSpeciesConfiguration(args: {
  workspaceId: string;
  speciesProfileId: string;
}): SpeciesConfigValidationResult {
  const { workspaceId, speciesProfileId } = args;
  
  const errors: SpeciesConfigValidationError[] = [];
  const warnings: SpeciesConfigValidationError[] = [];
  
  const sizeClasses = getSizeClassesForSpecies({ workspaceId, speciesProfileId });
  
  // Check for empty configuration
  if (sizeClasses.length === 0) {
    errors.push({
      field: 'sizeClasses',
      message: 'No size classes defined for this species',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }
  
  // Check each size class
  sizeClasses.forEach((sc) => {
    // Negative values check
    if (sc.minWeightGrams !== undefined && sc.minWeightGrams < 0) {
      errors.push({
        field: `sizeClass.${sc.id}.minWeightGrams`,
        message: 'Minimum weight cannot be negative',
        severity: 'error',
        details: { value: sc.minWeightGrams },
      });
    }
    
    if (sc.maxWeightGrams !== undefined && sc.maxWeightGrams < 0) {
      errors.push({
        field: `sizeClass.${sc.id}.maxWeightGrams`,
        message: 'Maximum weight cannot be negative',
        severity: 'error',
        details: { value: sc.maxWeightGrams },
      });
    }
    
    if (sc.minAgeDays !== undefined && sc.minAgeDays < 0) {
      errors.push({
        field: `sizeClass.${sc.id}.minAgeDays`,
        message: 'Minimum age cannot be negative',
        severity: 'error',
        details: { value: sc.minAgeDays },
      });
    }
    
    if (sc.maxAgeDays !== undefined && sc.maxAgeDays < 0) {
      errors.push({
        field: `sizeClass.${sc.id}.maxAgeDays`,
        message: 'Maximum age cannot be negative',
        severity: 'error',
        details: { value: sc.maxAgeDays },
      });
    }
    
    // Range consistency check
    if (
      sc.minWeightGrams !== undefined &&
      sc.maxWeightGrams !== undefined &&
      sc.minWeightGrams > sc.maxWeightGrams
    ) {
      errors.push({
        field: `sizeClass.${sc.id}.weightRange`,
        message: 'Minimum weight cannot exceed maximum weight',
        severity: 'error',
        details: { min: sc.minWeightGrams, max: sc.maxWeightGrams },
      });
    }
    
    if (
      sc.minAgeDays !== undefined &&
      sc.maxAgeDays !== undefined &&
      sc.minAgeDays > sc.maxAgeDays
    ) {
      errors.push({
        field: `sizeClass.${sc.id}.ageRange`,
        message: 'Minimum age cannot exceed maximum age',
        severity: 'error',
        details: { min: sc.minAgeDays, max: sc.maxAgeDays },
      });
    }
    
    // Pricing check
    if (sc.salePrice !== undefined && sc.salePrice < 0) {
      errors.push({
        field: `sizeClass.${sc.id}.salePrice`,
        message: 'Sale price cannot be negative',
        severity: 'error',
        details: { value: sc.salePrice },
      });
    }
  });
  
  // Check for overlapping weight ranges
  const sortedByWeight = [...sizeClasses].filter(
    (sc) => sc.minWeightGrams !== undefined && sc.maxWeightGrams !== undefined
  ).sort((a, b) => (a.minWeightGrams ?? 0) - (b.minWeightGrams ?? 0));
  
  for (let i = 0; i < sortedByWeight.length - 1; i++) {
    const current = sortedByWeight[i];
    const next = sortedByWeight[i + 1];
    
    if (
      current.maxWeightGrams !== undefined &&
      next.minWeightGrams !== undefined &&
      current.maxWeightGrams > next.minWeightGrams
    ) {
      warnings.push({
        field: 'weightRanges',
        message: `Overlapping weight ranges between "${current.name}" and "${next.name}"`,
        severity: 'warning',
        details: {
          class1: { name: current.name, max: current.maxWeightGrams },
          class2: { name: next.name, min: next.minWeightGrams },
        },
      });
    }
  }
  
  // Check for overlapping age ranges
  const sortedByAge = [...sizeClasses].filter(
    (sc) => sc.minAgeDays !== undefined
  ).sort((a, b) => (a.minAgeDays ?? 0) - (b.minAgeDays ?? 0));
  
  for (let i = 0; i < sortedByAge.length - 1; i++) {
    const current = sortedByAge[i];
    const next = sortedByAge[i + 1];
    
    if (
      current.maxAgeDays !== undefined &&
      next.minAgeDays !== undefined &&
      current.maxAgeDays > next.minAgeDays
    ) {
      warnings.push({
        field: 'ageRanges',
        message: `Overlapping age ranges between "${current.name}" and "${next.name}"`,
        severity: 'warning',
        details: {
          class1: { name: current.name, max: current.maxAgeDays },
          class2: { name: next.name, min: next.minAgeDays },
        },
      });
    }
  }
  
  // Check for exactly one default size class
  const defaultClasses = sizeClasses.filter((sc) => sc.isDefault);
  if (defaultClasses.length === 0) {
    warnings.push({
      field: 'isDefault',
      message: 'No default size class defined',
      severity: 'warning',
    });
  } else if (defaultClasses.length > 1) {
    warnings.push({
      field: 'isDefault',
      message: 'Multiple default size classes defined',
      severity: 'warning',
      details: { count: defaultClasses.length },
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// OPERATIONAL SETTINGS OPERATIONS
// ============================================================================

/**
 * Get operational settings for a species profile
 */
export function getOperationalSettingsForSpecies(speciesProfileId: string): SpeciesOperationalSettings | null {
  const allSettings = [store.getOperationalSettings(speciesProfileId)].filter(Boolean) as SpeciesOperationalSettings[];
  return allSettings.find((s) => s.speciesProfileId === speciesProfileId) || null;
}

/**
 * Update operational settings
 */
export function updateOperationalSettings(
  settingsId: string,
  updates: Partial<SpeciesOperationalSettings>
): SpeciesOperationalSettings | null {
  const settings = store.getOperationalSettings(settingsId);
  if (!settings) return null;
  
  const updated: SpeciesOperationalSettings = {
    ...settings,
    ...updates,
    id: settingsId, // Prevent ID change
    updatedAt: now(),
  };
  
  store.saveOperationalSettings(updated);
  return updated;
}

// ============================================================================
// EXPORT STORE FOR TESTING
// ============================================================================

export function _getStore(): SpeciesProfileStore {
  return store;
}
