import type { PreloadedSpeciesId } from "@/lib/species-config";

export type Purpose = "pet" | "business" | "vet";

export type Subtype =
  | "Granja/Bioterio"
  | "PIMVS"
  | "UMA"
  | "Comercializadora"
  | "Clínica Veterinaria";

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
  subtype: Subtype | null;
  animalClass: AnimalClass;
  species: PreloadedSpeciesId | string | null;
  name: string;
}

export type WizardStep = 1 | 2 | 3 | 4 | "summary";
