import type { AnimalClass, Purpose, Subtype } from "./types";

export const PURPOSE_OPTIONS: { value: Purpose; label: string; description: string }[] = [
  { value: "pet", label: "Mascota personal", description: "Llevar el control de mis propios animales en casa." },
  { value: "business", label: "Negocio / Operación", description: "Granja, bioterio, comercializadora u otra operación productiva." },
  { value: "vet", label: "Veterinaria", description: "Atención clínica o gestión veterinaria profesional." },
];

const BUSINESS_SUBTYPES: Subtype[] = ["Granja/Bioterio", "PIMVS", "UMA", "Comercializadora"];
const VET_SUBTYPES: Subtype[] = [...BUSINESS_SUBTYPES, "Clínica Veterinaria"];

export function getSubtypesFor(purposes: Purpose[]): Subtype[] {
  if (purposes.includes("vet")) return VET_SUBTYPES;
  if (purposes.includes("business")) return BUSINESS_SUBTYPES;
  return [];
}

export function requiresSubtype(purposes: Purpose[]): boolean {
  return purposes.some((p) => p === "business" || p === "vet");
}

export const ANIMAL_CLASS_OPTIONS: AnimalClass[] = [
  "Mamíferos",
  "Peces",
  "Reptiles",
  "Anfibios",
  "Aves",
  "Artrópodos",
  "Anélidos",
];

export const SPECIES_PLACEHOLDER: Record<AnimalClass, string> = {
  Mamíferos: "Ej: Ratón C57BL/6, conejo NZW, cuyo…",
  Peces: "Ej: Tilapia, pez cebra, trucha arcoíris…",
  Reptiles: "Ej: Iguana verde, gecko leopardo…",
  Anfibios: "Ej: Rana toro, ajolote, salamandra…",
  Aves: "Ej: Codorniz, gallina Leghorn, canario…",
  Artrópodos: "Ej: Tenebrio molitor, grillo común…",
  Anélidos: "Ej: Lombriz roja californiana…",
};
