export type CategoriaGasto =
  | "alimentacion"
  | "veterinaria"
  | "instalaciones"
  | "servicios"
  | "equipos"
  | "personal"
  | "logistica"
  | "otros";

export interface CategoriaGastoDef {
  value: CategoriaGasto;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORIAS_GASTO: CategoriaGastoDef[] = [
  { value: "alimentacion", label: "Alimentación", emoji: "🌾", color: "#10b981" },
  { value: "veterinaria", label: "Veterinaria y Salud", emoji: "🏥", color: "#ef4444" },
  { value: "instalaciones", label: "Instalaciones y Limpieza", emoji: "🏠", color: "#8b5cf6" },
  { value: "servicios", label: "Servicios (Luz, Agua, Gas)", emoji: "💡", color: "#f59e0b" },
  { value: "equipos", label: "Equipos y Material", emoji: "📦", color: "#3b82f6" },
  { value: "personal", label: "Personal", emoji: "👷", color: "#ec4899" },
  { value: "logistica", label: "Logística y Transporte", emoji: "🚚", color: "#f97316" },
  { value: "otros", label: "Otros", emoji: "🔬", color: "#6b7280" },
];

export const CATEGORIA_MAP: Record<string, CategoriaGastoDef> = Object.fromEntries(
  CATEGORIAS_GASTO.map((c) => [c.value, c]),
);

export const fmtMoney = (n: number) =>
  `$${(Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
