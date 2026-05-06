/**
 * Centralized cache invalidation bundles.
 *
 * Mutations across the app touch overlapping sets of cached queries
 * (e.g. any lote write must refresh the lotes list, the dashboard list,
 * and the stock view). Sprinkling 3-5 `qc.invalidateQueries(...)` calls
 * after every mutation drifts over time — keys get added in some places
 * and forgotten in others.
 *
 * Use these helpers from mutation `onSuccess` handlers so a single source
 * of truth controls which caches refresh together.
 *
 * NOTE: keys are kept as the existing literal arrays so this is a pure
 * refactor — no cache semantics change. As more pages migrate to the
 * `src/data/*` service layer, those literal keys can be replaced by the
 * factories in `queryKeys.ts` without touching call sites.
 */
import type { QueryClient } from "@tanstack/react-query";
import { lotesStockKey, lotesProyeccionKey } from "@/data/lotes";

/**
 * Invalidate every cache that depends on the lotes table.
 * Call after create / update / delete / split / event-applied mutations.
 */
export function invalidateLotes(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["lotes"] });
  qc.invalidateQueries({ queryKey: ["lotes-dash"] });
  qc.invalidateQueries({ queryKey: lotesStockKey });
  qc.invalidateQueries({ queryKey: lotesProyeccionKey });
}

/**
 * Invalidate caches affected by lote_eventos writes.
 * Superset of `invalidateLotes` because events can mutate lote totals,
 * caja assignments, and detail/timeline views.
 */
export function invalidateLoteEventos(qc: QueryClient) {
  invalidateLotes(qc);
  qc.invalidateQueries({ queryKey: ["lote-eventos"] });
  qc.invalidateQueries({ queryKey: ["lote-detalle"] });
}

/**
 * Invalidate every cache that depends on the gastos table.
 */
export function invalidateGastos(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["gastos-list"] });
  qc.invalidateQueries({ queryKey: ["gastos-recurrentes"] });
  qc.invalidateQueries({ queryKey: ["gastos-comparativa"] });
  qc.invalidateQueries({ queryKey: ["ventas-gastos"] });
}

/**
 * Invalidate caches affected by alertas personalizadas writes.
 */
export function invalidateAlertasPersonalizadas(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["alertas_personalizadas"] });
}

/**
 * Invalidate caches affected by alertas sistema (toggle/disable) writes.
 */
export function invalidateAlertasSistema(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["alertas_sistema_config"] });
  qc.invalidateQueries({ queryKey: ["alertas-desactivadas"] });
}
