import { ETAPAS, type Especie } from "@/lib/etapas";

export type PreloadedSpeciesId = "asf" | "raton" | "rata";

export const PRELOADED_TO_ESPECIE: Record<PreloadedSpeciesId, Especie> = {
  asf: "ASF",
  raton: "Raton",
  rata: "Rata",
};

interface PreloadedSpeciesMeta {
  displayName: string;
  fullName: string;
}

const META: Record<PreloadedSpeciesId, PreloadedSpeciesMeta> = {
  asf: { displayName: "ASF", fullName: "African Soft-furred Rat" },
  raton: { displayName: "Ratón", fullName: "Ratón de laboratorio" },
  rata: { displayName: "Rata", fullName: "Rata de laboratorio" },
};

export interface PreloadedSpecies {
  id: PreloadedSpeciesId;
  displayName: string;
  fullName: string;
  etapas: number;
  precioBase: number;
}

export const PRELOADED_SPECIES: ReadonlyArray<PreloadedSpecies> = (
  Object.keys(PRELOADED_TO_ESPECIE) as PreloadedSpeciesId[]
).map((id) => {
  const especie = PRELOADED_TO_ESPECIE[id];
  const etapas = ETAPAS[especie] ?? [];
  const pinky = etapas.find((e) => e.nombre === "Pinky");
  return {
    id,
    displayName: META[id].displayName,
    fullName: META[id].fullName,
    etapas: etapas.length,
    precioBase: pinky?.precio ?? etapas[0]?.precio ?? 0,
  };
});

export function isPreloadedSpeciesId(v: unknown): v is PreloadedSpeciesId {
  return v === "asf" || v === "raton" || v === "rata";
}

export function getPreloadedSpecies(id: PreloadedSpeciesId): PreloadedSpecies | undefined {
  return PRELOADED_SPECIES.find((s) => s.id === id);
}
