// Etapas de crecimiento por especie (días desde nacimiento + peso aproximado en gramos)
export type Especie = "ASF" | "Raton" | "Rata";

export interface Etapa {
  nombre: string;
  diasMin: number;
  diasMax: number; // 999 = abierto (∞)
  pesoMin: number;
  pesoMax: number; // 0 cuando no aplica límite superior representable; usar abierto si pesoMax === 9999
  etiqueta?: string; // sub-label (ej: "Destete")
}

// Catálogo basado en tablas de tamaño/etapa estándar de bioterio.
// El campo `etapaActual` se sigue calculando por edad (días).
export const ETAPAS: Record<Especie, Etapa[]> = {
  ASF: [
    { nombre: "Pinky", diasMin: 0, diasMax: 6, pesoMin: 1, pesoMax: 3 },
    { nombre: "Fuzzy", diasMin: 7, diasMax: 14, pesoMin: 3, pesoMax: 7 },
    { nombre: "Hopper", diasMin: 15, diasMax: 21, pesoMin: 7, pesoMax: 15 },
    { nombre: "Destetada", diasMin: 22, diasMax: 35, pesoMin: 15, pesoMax: 25, etiqueta: "Destete" },
    { nombre: "Chico", diasMin: 36, diasMax: 50, pesoMin: 25, pesoMax: 40 },
    { nombre: "Mediano", diasMin: 51, diasMax: 70, pesoMin: 40, pesoMax: 60 },
    { nombre: "Grande", diasMin: 71, diasMax: 9999, pesoMin: 60, pesoMax: 9999 },
  ],
  Raton: [
    { nombre: "Pinky", diasMin: 0, diasMax: 6, pesoMin: 1, pesoMax: 3 },
    { nombre: "Fuzzy", diasMin: 7, diasMax: 14, pesoMin: 3, pesoMax: 8 },
    { nombre: "Hopper", diasMin: 15, diasMax: 21, pesoMin: 8, pesoMax: 16 },
    { nombre: "Destetada", diasMin: 22, diasMax: 34, pesoMin: 16, pesoMax: 22, etiqueta: "Destete" },
    { nombre: "Chico", diasMin: 35, diasMax: 50, pesoMin: 22, pesoMax: 30 },
    { nombre: "Mediano", diasMin: 51, diasMax: 70, pesoMin: 30, pesoMax: 45 },
    { nombre: "Grande", diasMin: 71, diasMax: 9999, pesoMin: 45, pesoMax: 9999 },
  ],
  Rata: [
    { nombre: "Pinky", diasMin: 0, diasMax: 5, pesoMin: 0, pesoMax: 16 },
    { nombre: "Fuzzy", diasMin: 6, diasMax: 9, pesoMin: 16, pesoMax: 30 },
    { nombre: "Hopper", diasMin: 10, diasMax: 18, pesoMin: 31, pesoMax: 50 },
    { nombre: "Destetada", diasMin: 19, diasMax: 26, pesoMin: 51, pesoMax: 70, etiqueta: "Destete" },
    { nombre: "Chico", diasMin: 27, diasMax: 30, pesoMin: 71, pesoMax: 90 },
    { nombre: "Mediano", diasMin: 31, diasMax: 36, pesoMin: 91, pesoMax: 120 },
    { nombre: "Grande", diasMin: 37, diasMax: 42, pesoMin: 121, pesoMax: 150 },
    { nombre: "Extra Grande", diasMin: 43, diasMax: 48, pesoMin: 151, pesoMax: 200 },
    { nombre: "Jumbo", diasMin: 49, diasMax: 54, pesoMin: 201, pesoMax: 250 },
    { nombre: "Extra Jumbo", diasMin: 55, diasMax: 64, pesoMin: 251, pesoMax: 300 },
    { nombre: "Mega", diasMin: 65, diasMax: 74, pesoMin: 301, pesoMax: 349 },
    { nombre: "Extra Mega", diasMin: 75, diasMax: 99, pesoMin: 350, pesoMax: 400 },
    { nombre: "Ratota", diasMin: 100, diasMax: 9999, pesoMin: 401, pesoMax: 9999 },
  ],
};

export function diasDesde(fecha: string | Date): number {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function etapaActual(especie: Especie, fechaNacimiento: string): string {
  const dias = diasDesde(fechaNacimiento);
  const etapas = ETAPAS[especie] ?? [];
  return etapas.find((e) => dias >= e.diasMin && dias <= e.diasMax)?.nombre ?? "—";
}

// Helpers de formato para la UI
export function rangoDias(e: Etapa): string {
  if (e.diasMax >= 9999) return `${e.diasMin}–∞d`;
  return `${e.diasMin}–${e.diasMax}d`;
}

export function rangoPeso(e: Etapa): string {
  if (e.pesoMax >= 9999) return `${e.pesoMin}–∞`;
  return `${e.pesoMin}–${e.pesoMax}`;
}
