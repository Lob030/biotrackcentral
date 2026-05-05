import { diasDesde, etapaActual, type Especie } from "./etapas";

export type AlertaSeveridad = "info" | "warning" | "critical";

export interface Alerta {
  id: string;
  tipo: "destete" | "engorda_listo" | "caja_limpieza" | "caja_sin_lote" | "lote_vacio";
  severidad: AlertaSeveridad;
  titulo: string;
  descripcion: string;
  loteId?: string;
  cajaId?: string;
  accion?: { label: string; href: string };
}

// Umbrales para considerar "listo para destete"
const DIAS_DESTETE: Record<Especie, number> = {
  Raton: 21,
  Rata: 24,
  ASF: 28,
};

// Días desde introducción a engorda para considerar "listo"
const DIAS_ENGORDA_LISTO = 60;

export function generarAlertas(
  lotes: any[],
  cajas: any[],
  desactivadas: Set<string> = new Set(),
): Alerta[] {
  const alertas: Alerta[] = [];

  for (const lote of lotes) {
    if (lote.estado !== "activo") continue;
    const especie = lote.especie as Especie;
    const dias = diasDesde(lote.fecha_nacimiento);

    // Destete pendiente
    if (lote.tipo === "nacimiento") {
      const umbral = DIAS_DESTETE[especie] ?? 21;
      if (dias >= umbral) {
        const exceso = dias - umbral;
        alertas.push({
          id: `destete-${lote.id}`,
          tipo: "destete",
          severidad: exceso > 7 ? "critical" : "warning",
          titulo: `Lote ${lote.codigo || lote.id.slice(0, 6)} listo para destete`,
          descripcion: `${especie} · ${dias} días · etapa ${etapaActual(especie, lote.fecha_nacimiento)}. Recomendado dividir.`,
          loteId: lote.id,
          accion: { label: "Ir a lote", href: "/lotes" },
        });
      }
    }

    // Engorda lista para venta
    if (lote.tipo === "engorda" && lote.fecha_introduccion_caja) {
      const diasEngorda = diasDesde(lote.fecha_introduccion_caja);
      if (diasEngorda >= DIAS_ENGORDA_LISTO) {
        alertas.push({
          id: `engorda-${lote.id}`,
          tipo: "engorda_listo",
          severidad: "info",
          titulo: `Lote ${lote.codigo || lote.id.slice(0, 6)} listo para venta`,
          descripcion: `${diasEngorda} días en engorda · ${lote.cantidad_actual} ind.`,
          loteId: lote.id,
          accion: { label: "Ir a lote", href: "/lotes" },
        });
      }
    }

    // Lote vacío pero activo
    if ((lote.cantidad_actual ?? 0) === 0) {
      alertas.push({
        id: `vacio-${lote.id}`,
        tipo: "lote_vacio",
        severidad: "warning",
        titulo: `Lote ${lote.codigo || lote.id.slice(0, 6)} sin individuos`,
        descripcion: `Marcado como activo pero con 0 individuos. Considera finalizarlo.`,
        loteId: lote.id,
        accion: { label: "Ir a lote", href: "/lotes" },
      });
    }
  }

  for (const caja of cajas) {
    if (caja.estado === "limpieza") {
      alertas.push({
        id: `limpieza-${caja.id}`,
        tipo: "caja_limpieza",
        severidad: "info",
        titulo: `Caja ${caja.codigo} en limpieza`,
        descripcion: `Pendiente de habilitar para nuevo uso.`,
        cajaId: caja.id,
        accion: { label: "Ver caja", href: "/cajas" },
      });
    }
  }

  // ordenar por severidad
  const peso = { critical: 0, warning: 1, info: 2 };
  return alertas
    .filter((a) => !desactivadas.has(a.tipo))
    .sort((a, b) => peso[a.severidad] - peso[b.severidad]);
}
