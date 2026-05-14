export type PreloadedSpeciesId = "asf" | "raton" | "rata" | "insectos";

export interface PreloadedSpecies {
  id: PreloadedSpeciesId;
  displayName: string;
  fullName: string;
  etapas: number;
  precioBase: number;
}

export const PRELOADED_SPECIES: ReadonlyArray<PreloadedSpecies> = [
  { id: "asf", displayName: "ASF", fullName: "African Soft-furred Rat", etapas: 7, precioBase: 15 },
  { id: "raton", displayName: "Ratón", fullName: "Ratón de laboratorio", etapas: 7, precioBase: 16 },
  { id: "rata", displayName: "Rata", fullName: "Rata de laboratorio", etapas: 13, precioBase: 16 },
  { id: "insectos", displayName: "Insectos", fullName: "Colonias de Insectos (Dubia, Tenebrio, etc)", etapas: 4, precioBase: 0 },
];

export function isPreloadedSpeciesId(v: unknown): v is PreloadedSpeciesId {
  return v === "asf" || v === "raton" || v === "rata" || v === "insectos";
}

export function getPreloadedSpecies(id: PreloadedSpeciesId): PreloadedSpecies | undefined {
  return PRELOADED_SPECIES.find((s) => s.id === id);
}
