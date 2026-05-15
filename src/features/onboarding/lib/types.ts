/**
 * Onboarding draft types.
 *
 * Species selection is expressed as a discriminated `SpeciesSeed` so the
 * workspace creation flow can transactionally seed the matching
 * `workspace_species_profiles` row before any lot/lineage/inventory work.
 *
 * NO PreloadedSpeciesId. NO hardcoded species strings.
 */

export type Purpose = "pet" | "business" | "vet";

export type OperationType =
  | "Bioterio"
  | "Granja cunícola"
  | "Granja avícola"
  | "Ganadería bovina"
  | "PIMVS"
  | "UMA"
  | "Comercializadora"
  | "Acuario / Operación acuática"
  | "Clínica Veterinaria";

export interface OperationalBlueprint {
  id: OperationType;
  name: string;
  description: string;
  modules: string[];
  isPrimary: boolean;
}

export type AnimalClass =
  | "Mamíferos"
  | "Peces"
  | "Reptiles"
  | "Anfibios"
  | "Aves"
  | "Artrópodos"
  | "Anélidos";

/**
 * Species seed for transactional workspace creation.
 * - `blueprint`: instantiate a starter species blueprint by `taxonomyKey`
 * - `custom`: create a fully custom workspace species profile
 */
export type SpeciesSeed =
  | { kind: "blueprint"; taxonomyKey: string; displayName: string }
  | { kind: "custom"; displayName: string };

export interface WorkspaceDraft {
  purpose: Purpose;
  operation: OperationType | null;
  animalClass: AnimalClass;
  /** Required when operation === "Bioterio". */
  speciesSeed: SpeciesSeed | null;
  name: string;
}

export type WizardStep = 1 | 2 | 3 | 4 | "summary";
