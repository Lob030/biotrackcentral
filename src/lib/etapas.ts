// Etapas de crecimiento por especie (días desde nacimiento)
export type Especie = "ASF" | "Raton" | "Rata";

interface Etapa {
  nombre: string;
  diasMin: number;
  diasMax: number;
}

export const ETAPAS: Record<Especie, Etapa[]> = {
  Raton: [
    { nombre: "Pinky", diasMin: 0, diasMax: 7 },
    { nombre: "Pelón", diasMin: 8, diasMax: 14 },
    { nombre: "Pelechado", diasMin: 15, diasMax: 21 },
    { nombre: "Destetada", diasMin: 22, diasMax: 35 },
    { nombre: "Mediano", diasMin: 36, diasMax: 70 },
    { nombre: "Adulto", diasMin: 71, diasMax: 999 },
  ],
  Rata: [
    { nombre: "Pinky", diasMin: 0, diasMax: 10 },
    { nombre: "Pelón", diasMin: 11, diasMax: 17 },
    { nombre: "Pelechado", diasMin: 18, diasMax: 24 },
    { nombre: "Destetada", diasMin: 25, diasMax: 45 },
    { nombre: "Mediano", diasMin: 46, diasMax: 90 },
    { nombre: "Adulto", diasMin: 91, diasMax: 999 },
  ],
  ASF: [
    { nombre: "Pinky", diasMin: 0, diasMax: 10 },
    { nombre: "Pelechado", diasMin: 11, diasMax: 28 },
    { nombre: "Destetada", diasMin: 29, diasMax: 60 },
    { nombre: "Mediano", diasMin: 61, diasMax: 120 },
    { nombre: "Adulto", diasMin: 121, diasMax: 999 },
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
