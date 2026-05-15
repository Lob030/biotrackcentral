/**
 * Species Blueprint Registry
 *
 * Pure registry of starter blueprints keyed by `taxonomyKey` (the canonical
 * lower-cased taxonomy reference, e.g. `asf`, `tenebrios`, `mus_musculus`).
 *
 * STRICT RULES:
 * - No hardcoded fallback. Lookups for unknown keys return `undefined`.
 * - Every workspace species profile is created from a registry blueprint OR
 *   defined as a fully-custom profile via the species runtime — never from a
 *   string alias guess.
 * - `taxonomyKey` here matches `workspace_species_profiles.taxonomy_key`
 *   (generated column = lower(code)).
 */
import {
  ASF_STARTER_BLUEPRINT,
  ASF_DEFAULT_SIZE_CLASSES,
  ASF_DEFAULT_OPERATIONAL_SETTINGS,
  TENEBRIO_STARTER_BLUEPRINT,
  TENEBRIO_DEFAULT_SIZE_CLASSES,
  TENEBRIO_DEFAULT_OPERATIONAL_SETTINGS,
  type WorkspaceSpeciesProfile,
  type SpeciesSizeClass,
  type SpeciesOperationalSettings,
} from "../runtime/types";

export interface SpeciesBlueprint {
  taxonomyKey: string;
  code: string;
  displayName: string;
  scientificName?: string;
  profile: WorkspaceSpeciesProfile;
  sizeClasses: Omit<SpeciesSizeClass, "id" | "createdAt" | "updatedAt">[];
  settings: Omit<
    SpeciesOperationalSettings,
    "id" | "workspaceId" | "speciesProfileId" | "createdAt" | "updatedAt"
  >;
}

export const SPECIES_BLUEPRINTS: ReadonlyArray<SpeciesBlueprint> = [
  {
    taxonomyKey: "asf",
    code: "ASF",
    displayName: "ASF",
    scientificName: "Mastomys natalensis",
    profile: ASF_STARTER_BLUEPRINT,
    sizeClasses: ASF_DEFAULT_SIZE_CLASSES,
    settings: ASF_DEFAULT_OPERATIONAL_SETTINGS,
  },
  {
    taxonomyKey: "tenebrios",
    code: "Tenebrios",
    displayName: "Tenebrios",
    scientificName: "Tenebrio molitor",
    profile: TENEBRIO_STARTER_BLUEPRINT,
    sizeClasses: TENEBRIO_DEFAULT_SIZE_CLASSES,
    settings: TENEBRIO_DEFAULT_OPERATIONAL_SETTINGS,
  },
] as const;

export function findBlueprintByTaxonomyKey(
  taxonomyKey: string,
): SpeciesBlueprint | undefined {
  const key = taxonomyKey.trim().toLowerCase();
  return SPECIES_BLUEPRINTS.find((b) => b.taxonomyKey === key);
}

export function listBlueprints(): ReadonlyArray<SpeciesBlueprint> {
  return SPECIES_BLUEPRINTS;
}
