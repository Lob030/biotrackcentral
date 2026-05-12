// Catálogo de alertas del sistema (las 5 que existen actualmente en lib/alertas.ts)
// Su key se usa para guardar el estado activa/inactiva por organización
// en la tabla alertas_sistema_config.

export interface AlertaSistemaMeta {
  key: string;
  emoji: string;
  nombre: string;
  descripcion: string;
}

export const ALERTAS_SISTEMA: AlertaSistemaMeta[] = [
  {
    key: "destete",
    emoji: "🐭",
    nombre: "Destete pendiente",
    descripcion: "Detecta lotes de nacimiento que han alcanzado la edad para destetar.",
  },
  {
    key: "engorda_listo",
    emoji: "📦",
    nombre: "Engorda lista para venta",
    descripcion: "Lotes en engorda con más de 60 días desde su introducción.",
  },
  {
    key: "lote_vacio",
    emoji: "❌",
    nombre: "Lote sin individuos",
    descripcion: "Lotes activos pero con 0 individuos que conviene finalizar.",
  },
  {
    key: "caja_limpieza",
    emoji: "🧼",
    nombre: "Caja en limpieza",
    descripcion: "Cajas marcadas en limpieza pendientes de habilitar.",
  },
  {
    key: "caja_sin_lote",
    emoji: "📭",
    nombre: "Caja sin lote",
    descripcion: "Cajas en uso sin lote asignado.",
  },
];
