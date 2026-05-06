/**
 * Centralized React Query key factories.
 *
 * Goal: stop sprinkling stringly-typed keys ("lotes", "lotes-dash", "lotes-stock", …)
 * across pages. Importing the same factory here keeps invalidations consistent.
 *
 * Usage:
 *   queryKey: lotesKeys.list({ estado: "activo" })
 *   qc.invalidateQueries({ queryKey: lotesKeys.all })
 *
 * Existing string keys still work; migrate opportunistically.
 */

export const lotesKeys = {
  all: ["lotes"] as const,
  lists: () => [...lotesKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...lotesKeys.lists(), filters ?? {}] as const,
  detail: (id: string) => [...lotesKeys.all, "detail", id] as const,
  options: () => [...lotesKeys.all, "options"] as const,
  proyeccion: () => [...lotesKeys.all, "proyeccion"] as const,
};

export const cajasKeys = {
  all: ["cajas"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...cajasKeys.all, "list", filters ?? {}] as const,
  options: () => [...cajasKeys.all, "options"] as const,
};

export const clientesKeys = {
  all: ["clientes"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...clientesKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...clientesKeys.all, "detail", id] as const,
};

export const pedidosKeys = {
  all: ["pedidos"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...pedidosKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...pedidosKeys.all, "detail", id] as const,
};

export const gastosKeys = {
  all: ["gastos"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...gastosKeys.all, "list", filters ?? {}] as const,
  recurrentes: () => [...gastosKeys.all, "recurrentes"] as const,
  comparativa: (range: Record<string, unknown>) =>
    [...gastosKeys.all, "comparativa", range] as const,
};

export const alertasKeys = {
  all: ["alertas"] as const,
  sistemaConfig: () => [...alertasKeys.all, "sistema_config"] as const,
  personalizadas: () => [...alertasKeys.all, "personalizadas"] as const,
  desactivadas: () => [...alertasKeys.all, "desactivadas"] as const,
};

export const lineasKeys = {
  all: ["lineas_geneticas"] as const,
  options: () => [...lineasKeys.all, "options"] as const,
};

export const orgKeys = {
  all: ["org"] as const,
  detail: (id?: string) => [...orgKeys.all, "detail", id ?? "self"] as const,
  miembros: (id?: string) => [...orgKeys.all, "miembros", id ?? "self"] as const,
};
