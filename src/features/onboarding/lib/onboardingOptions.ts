import type { AnimalClass, Purpose, OperationType, OperationalBlueprint } from "./types";

export const PURPOSE_OPTIONS: { value: Purpose; label: string; description: string }[] = [
  { value: "pet", label: "Mascota personal", description: "Llevar el control de mis propios animales en casa." },
  { value: "business", label: "Negocio / Operación", description: "Granja, bioterio, comercializadora u otra operación productiva." },
  { value: "vet", label: "Veterinaria", description: "Atención clínica o gestión veterinaria profesional." },
];

export const OPERATIONAL_BLUEPRINTS: OperationalBlueprint[] = [
  {
    id: "Bioterio",
    name: "Bioterio",
    description: "Gestión operacional por lotes para especies de reproducción, producción o alimentación controlada.",
    modules: ["Lotes", "Reproducción", "Clasificación", "Disponibilidad", "IA operacional"],
    isPrimary: true,
  },
  {
    id: "Granja avícola",
    name: "Granja avícola",
    description: "Producción de aves, huevos y gestión de postura.",
    modules: ["Producción", "Clasificación", "Postura", "Inventario"],
    isPrimary: true,
  },
  {
    id: "Comercializadora",
    name: "Comercializadora",
    description: "Gestión de stock comercial, ventas y clientes.",
    modules: ["Stock", "Ventas", "Clientes", "Inventario"],
    isPrimary: true,
  },
  {
    id: "Granja cunícola",
    name: "Granja cunícola",
    description: "Producción de conejos para pie de cría o abasto.",
    modules: ["Lotes", "Reproducción", "Inventario", "Ventas"],
    isPrimary: false,
  },
  {
    id: "Ganadería bovina",
    name: "Ganadería bovina",
    description: "Operación ganadera para producción de carne o leche.",
    modules: ["Individuos", "Salud", "Producción", "Ventas"],
    isPrimary: false,
  },
  {
    id: "PIMVS",
    name: "PIMVS",
    description: "Predios o instalaciones que manejan vida silvestre.",
    modules: ["Legal", "Trazabilidad", "Inventario", "Salud"],
    isPrimary: false,
  },
  {
    id: "UMA",
    name: "UMA",
    description: "Unidades de Manejo para la Conservación de la Vida Silvestre.",
    modules: ["Conservación", "Trazabilidad", "Legal", "Reproducción"],
    isPrimary: false,
  },
  {
    id: "Acuario / Operación acuática",
    name: "Acuario / Operación acuática",
    description: "Gestión de biomasa acuática y calidad de agua.",
    modules: ["Estanques", "Biomasa", "Calidad de Agua", "Inventario"],
    isPrimary: false,
  },
  {
    id: "Clínica Veterinaria",
    name: "Clínica Veterinaria",
    description: "Atención clínica, consultas y gestión de pacientes.",
    modules: ["Pacientes", "Consultas", "Expedientes", "Facturación"],
    isPrimary: false,
  },
];

export function getOperationsFor(purpose: Purpose | null): OperationalBlueprint[] {
  if (purpose === "vet") {
    return OPERATIONAL_BLUEPRINTS.filter(bp => bp.id === "Clínica Veterinaria" || bp.isPrimary);
  }
  if (purpose === "business") {
    return OPERATIONAL_BLUEPRINTS.filter(bp => bp.id !== "Clínica Veterinaria");
  }
  return [];
}

export function requiresOperation(purpose: Purpose | null): boolean {
  return purpose === "business" || purpose === "vet";
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
