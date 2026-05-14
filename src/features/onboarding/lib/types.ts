import type { PreloadedSpeciesId } from "@/modules/bioterio/lib/species-config";

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

export interface WorkspaceDraft {
  purpose: Purpose;
  operation: OperationType | null;
  animalClass: AnimalClass;
  species: PreloadedSpeciesId | string | null;
  name: string;
}

export type WizardStep = 1 | 2 | 3 | 4 | "summary";
