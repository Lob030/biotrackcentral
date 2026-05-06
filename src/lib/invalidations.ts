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
  // Covers all keys prefixed with ["lotes", ...] (lotesKeys.list / .detail / .options)
  qc.invalidateQueries({ queryKey: ["lotes"] });
  qc.invalidateQueries({ queryKey: lotesStockKey });
  qc.invalidateQueries({ queryKey: lotesProyeccionKey });
  // Alertas page reads lotes under its own key — keep it in sync.
  qc.invalidateQueries({ queryKey: ["lotes-alertas"] });
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
  // Pedidos page derives stock by etapa from lote totals.
  qc.invalidateQueries({ queryKey: ["stock-por-etapa"] });
}

/**
 * Invalidate every cache that depends on the cajas table.
 */
export function invalidateCajas(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["cajas"] });
  qc.invalidateQueries({ queryKey: ["cajas-alertas"] });
}

/**
 * Invalidate every cache that depends on the clientes table.
 */
export function invalidateClientes(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["clientes"] });
  qc.invalidateQueries({ queryKey: ["clientes-alertas"] });
}

/**
 * Invalidate every cache that depends on the pedidos table.
 */
export function invalidatePedidos(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["pedidos"] });
  qc.invalidateQueries({ queryKey: ["pedidos-alertas"] });
  qc.invalidateQueries({ queryKey: ["ventas-pedidos"] });
  qc.invalidateQueries({ queryKey: ["mejores-clientes-pedidos"] });
  qc.invalidateQueries({ queryKey: ["mejores-clientes-pedidos-anio"] });
  qc.invalidateQueries({ queryKey: ["mejores-clientes-ultima"] });
}

/**
 * Invalidate every cache that depends on the gastos table.
 */
export function invalidateGastos(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["gastos-list"] });
  qc.invalidateQueries({ queryKey: ["gastos-recurrentes"] });
  qc.invalidateQueries({ queryKey: ["gastos-comparativa"] });
  qc.invalidateQueries({ queryKey: ["ventas-gastos"] });
  qc.invalidateQueries({ queryKey: ["gastos-alertas"] });
}

/**
 * Invalidate caches affected by alertas personalizadas writes.
 */
export function invalidateAlertasPersonalizadas(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["alertas_personalizadas"] });
  qc.invalidateQueries({ queryKey: ["alertas_personalizadas_eval"] });
}

/**
 * Invalidate caches affected by alertas sistema (toggle/disable) writes.
 */
export function invalidateAlertasSistema(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["alertas_sistema_config"] });
  qc.invalidateQueries({ queryKey: ["alertas-desactivadas"] });
}
