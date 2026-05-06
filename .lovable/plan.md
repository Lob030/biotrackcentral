## Goal

Continue Phase 2 of the architecture refactor. Extract the most duplicated, lowest-risk Supabase access patterns into a shared service layer under `src/data/`. No UI changes, no business logic changes, no schema changes, no routing changes.

## Scope (this batch)

Migrate **list reads + simple CRUD** for the 4 simplest entities. Each entity gets its own focused module so we can stop sprinkling `supabase.from("…")` across pages.

Entities migrated this batch (in order, smallest to largest):

1. `cajas` (Cajas page only — single source)
2. `lineas_geneticas` (LineasGeneticas page only)
3. `clientes` (Clientes page + reused on profile/pedidos)
4. `lotes` *list-level only* (Lotes page list query + Dashboard list query). Mutations in `Lotes.tsx` (create/update/delete/split) stay in place this round — they touch business logic.

Explicitly **out of scope for this batch** (left for a future phase):
- `pedidos`, `gastos`, `alertas` (more complex, used in many places).
- `LoteDetalle`, `ClientePerfil` deep reads.
- Mutation logic inside `Lotes.tsx`, `Pedidos.tsx`, `GastosTab.tsx`.
- `AdministrarAlertasModal`, `MejoresClientesTab`, `ProyeccionDisponibilidad`.

## New files

```text
src/data/
  options.ts            (already exists)
  cajas.ts              NEW
  lineasGeneticas.ts    NEW
  clientes.ts           NEW
  lotes.ts              NEW   (list-level only)
```

Each module exposes:
- Plain async fetchers (`fetchCajas`, `createCaja`, `updateCaja`, `deleteCaja`, …) that wrap `supabase.from(...)` and unwrap `{ data, error }`.
- Thin react-query hooks (`useCajasList`, `useUpsertCaja`, `useDeleteCaja`, …) wired to existing `queryKeys.ts` factories so cache invalidation stays consistent with what already works.
- Types imported from `@/lib/types.ts` (`CajaRow`, `ClienteRow`, `LoteRow`, …) — drop the per-page ad-hoc `interface Caja {...}`.

## Page edits (surgical only)

For each page below, replace inline `useQuery`/`useMutation` blocks with the new hooks. **No JSX, no styling, no validation, no toast text changes.**

- `src/pages/Cajas.tsx` — replace `useQuery(["cajas"])`, upsert, delete with `useCajasList`, `useUpsertCaja`, `useDeleteCaja`. Drop local `interface Caja`.
- `src/pages/LineasGeneticas.tsx` — replace list/upsert/delete + the small "lotes count by linea" aggregation read.
- `src/pages/Clientes.tsx` — replace list/upsert/delete.
- `src/pages/Lotes.tsx` — replace **only** the list `useQuery` call; keep all mutations as-is.
- `src/pages/Dashboard.tsx` — switch its lotes-list read to `useLotesList({ estado: "activo" })`.

All existing string query keys (`["cajas"]`, `["lotes"]`, `["lineas_geneticas"]`, `["clientes"]`) get aliased through the factories in `queryKeys.ts` so invalidations from un-migrated pages keep working. Where a page invalidates `["cajas"]`, the new hook keys remain compatible because `cajasKeys.all = ["cajas"]`.

## Safety guarantees

- No file is rewritten end-to-end — only the data hooks at the top swap.
- Field selection strings (`"*, lineas_geneticas(nombre, color_etiqueta), cajas(codigo)"`) are preserved verbatim inside the new fetchers so component render code is untouched.
- `organization_id` injection on inserts stays the responsibility of the caller (it already comes from `useAuth().profile`) — service functions accept full payloads.
- Toast messages (`friendlyError`, success copy) stay in pages.
- No new dependencies.

## Verification checklist (after edits)

- Cajas page: list, filter by uso/estado, create, edit, delete still work.
- Líneas Genéticas: list with lote counts, create, edit, delete.
- Clientes: list, create, edit, delete.
- Lotes: list + filters render identically (mutations untouched).
- Dashboard: KPIs + active lotes list unchanged.
- Auth flow, sidebar, routing, RoleRoute, Suspense fallbacks: untouched.

## Follow-ups (future phases — not now)

- Phase 2b: extract `pedidos` and `gastos` (higher complexity, multiple consumers).
- Phase 2c: extract aggregation/reporting reads used by `Ventas`, `MejoresClientesTab`, `ProyeccionDisponibilidad`.
- Phase 3: split the largest components (`AdministrarAlertasModal` 885 LOC, `GastosTab` 699 LOC, `Ventas` 624 LOC) into smaller pieces — separate task.

Ready to execute on approval.