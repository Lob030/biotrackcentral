// Etapas de crecimiento por especie (días desde nacimiento + peso aproximado en gramos)
export type Especie = "ASF" | "Raton" | "Rata";

export interface Etapa {
  nombre: string;
  diasMin: number;
  diasMax: number; // 9999 = abierto (∞)
  pesoMin: number;
  pesoMax: number; // 9999 = abierto (∞)
  etiqueta?: string; // sub-label (ej: "Destete")
  precio: number; // Precio unitario en USD
}

// Catálogo basado en tablas de tamaño/etapa estándar de bioterio.
export const ETAPAS: Record<Especie, Etapa[]> = {
  ASF: [
    { nombre: "Pinky", diasMin: 0, diasMax: 6, pesoMin: 1, pesoMax: 3, precio: 15.0 },
    { nombre: "Fuzzy", diasMin: 7, diasMax: 14, pesoMin: 3, pesoMax: 7, precio: 18.0 },
    { nombre: "Hopper", diasMin: 15, diasMax: 21, pesoMin: 7, pesoMax: 15, precio: 23.0 },
    { nombre: "Destetada", diasMin: 22, diasMax: 35, pesoMin: 15, pesoMax: 25, etiqueta: "Destete", precio: 30.0 },
    { nombre: "Chico", diasMin: 36, diasMax: 50, pesoMin: 25, pesoMax: 40, precio: 33.0 },
    { nombre: "Mediano", diasMin: 51, diasMax: 70, pesoMin: 40, pesoMax: 60, precio: 37.0 },
    { nombre: "Grande", diasMin: 71, diasMax: 9999, pesoMin: 60, pesoMax: 9999, precio: 42.0 },
  ],
  Raton: [
    { nombre: "Pinky", diasMin: 0, diasMax: 6, pesoMin: 1, pesoMax: 3, precio: 16.0 },
    { nombre: "Fuzzy", diasMin: 7, diasMax: 14, pesoMin: 3, pesoMax: 8, precio: 19.0 },
    { nombre: "Hopper", diasMin: 15, diasMax: 21, pesoMin: 8, pesoMax: 16, precio: 26.0 },
    { nombre: "Destetada", diasMin: 22, diasMax: 34, pesoMin: 16, pesoMax: 22, etiqueta: "Destete", precio: 30.0 },
    { nombre: "Chico", diasMin: 35, diasMax: 50, pesoMin: 22, pesoMax: 30, precio: 33.0 },
    { nombre: "Mediano", diasMin: 51, diasMax: 70, pesoMin: 30, pesoMax: 45, precio: 38.0 },
    { nombre: "Grande", diasMin: 71, diasMax: 9999, pesoMin: 45, pesoMax: 9999, precio: 43.0 },
  ],
  Rata: [
    { nombre: "Pinky", diasMin: 0, diasMax: 5, pesoMin: 0, pesoMax: 16, precio: 16.0 },
    { nombre: "Fuzzy", diasMin: 6, diasMax: 9, pesoMin: 16, pesoMax: 30, precio: 18.0 },
    { nombre: "Hopper", diasMin: 10, diasMax: 18, pesoMin: 31, pesoMax: 50, precio: 23.0 },
    { nombre: "Destetada", diasMin: 19, diasMax: 26, pesoMin: 51, pesoMax: 70, etiqueta: "Destete", precio: 30.0 },
    { nombre: "Chico", diasMin: 27, diasMax: 30, pesoMin: 71, pesoMax: 90, precio: 33.0 },
    { nombre: "Mediano", diasMin: 31, diasMax: 36, pesoMin: 91, pesoMax: 120, precio: 37.0 },
    { nombre: "Grande", diasMin: 37, diasMax: 42, pesoMin: 121, pesoMax: 150, precio: 40.0 },
    { nombre: "Extra Grande", diasMin: 43, diasMax: 48, pesoMin: 151, pesoMax: 200, precio: 50.0 },
    { nombre: "Jumbo", diasMin: 49, diasMax: 54, pesoMin: 201, pesoMax: 250, precio: 55.0 },
    { nombre: "Extra Jumbo", diasMin: 55, diasMax: 64, pesoMin: 251, pesoMax: 300, precio: 60.0 },
    { nombre: "Mega", diasMin: 65, diasMax: 74, pesoMin: 301, pesoMax: 349, precio: 65.0 },
    { nombre: "Extra Mega", diasMin: 75, diasMax: 99, pesoMin: 350, pesoMax: 400, precio: 75.0 },
    { nombre: "Ratota", diasMin: 100, diasMax: 9999, pesoMin: 401, pesoMax: 9999, precio: 80.0 },
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

// ============= SISTEMA DE PRECIOS Y DESCUENTOS =============

export function obtenerPrecio(especie: Especie, etapa: string): number {
  const etapas = ETAPAS[especie] ?? [];
  return etapas.find((e) => e.nombre === etapa)?.precio ?? 0;
}

export interface DescuentoAplicado {
  monto: number;
  porcentaje: number;
  razon: string;
}

export function calcularDescuento(subtotal: number): DescuentoAplicado | null {
  if (subtotal >= 10000) return { porcentaje: 20, monto: subtotal * 0.2, razon: "Volumen > $10,000" };
  if (subtotal >= 5000) return { porcentaje: 15, monto: subtotal * 0.15, razon: "Volumen > $5,000" };
  if (subtotal >= 2500) return { porcentaje: 10, monto: subtotal * 0.10, razon: "Volumen > $2,500" };
  if (subtotal >= 600) return { porcentaje: 5, monto: subtotal * 0.05, razon: "Volumen > $600" };
  return null;
}

export function calcularTotales(subtotal: number) {
  const descuento = calcularDescuento(subtotal);
  const montoDescuento = descuento?.monto ?? 0;
  const total = subtotal - montoDescuento;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    descuento: descuento ? { ...descuento, monto: Math.round(montoDescuento * 100) / 100 } : null,
    total: Math.round(total * 100) / 100,
  };
}
